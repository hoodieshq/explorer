import { type Address, createSolanaRpc, type Signature } from '@solana/kit';

import {
    getSignaturesPage,
    getTransaction,
    type RawTransaction,
    type SignatureInfo,
    type SolanaRpc,
} from '../lib/walk-instructions';

// Hard cap on signatures fetched per call. Reconstruction only produces correct
// state if we have every event back to Initialize, so the cap is a guardrail —
// hitting it means the result is partial and `truncated` is set.
const HISTORY_LIMIT = 1000;
// `getSignaturesForAddress` accepts up to 1000 per call.
const SIG_PAGE_SIZE = 1000;
// Conservative parallelism for `getTransaction` requests; many public RPCs
// throttle large bursts.
const TX_BATCH_SIZE = 100;

export interface FetchAccountTransactionsResult {
    /** Chronological order (oldest first) so callers can replay events directly. */
    transactions: RawTransaction[];
    /** True if `HISTORY_LIMIT` was hit and older signatures may have been dropped. */
    truncated: boolean;
}

/**
 * Fetch every transaction touching `account` (up to `HISTORY_LIMIT`). Pure I/O —
 * no parsing, no domain logic. Returns kit-shaped raw transactions in chronological
 * order, paired with their signature info.
 */
export async function fetchAccountTransactions(
    rpcUrl: string,
    account: Address,
): Promise<FetchAccountTransactionsResult> {
    const rpc = createSolanaRpc(rpcUrl);

    const sigs = await fetchAllSignatures(rpc, account);
    if (sigs.length === 0) return { transactions: [], truncated: false };
    const truncated = sigs.length >= HISTORY_LIMIT;
    // RPC returns newest-first; replay needs chronological order.
    sigs.reverse();

    const txResults = await fetchTransactionsChunked(
        rpc,
        sigs.map(s => s.signature),
    );

    const transactions: RawTransaction[] = [];
    for (let i = 0; i < sigs.length; i++) {
        const transaction = txResults[i];
        if (!transaction) continue;
        transactions.push({ info: sigs[i], transaction });
    }

    return { transactions, truncated };
}

async function fetchAllSignatures(rpc: SolanaRpc, account: Address): Promise<SignatureInfo[]> {
    const sigs: SignatureInfo[] = [];
    let before: Signature | undefined;

    while (sigs.length < HISTORY_LIMIT) {
        const limit = Math.min(SIG_PAGE_SIZE, HISTORY_LIMIT - sigs.length);
        const batch = await getSignaturesPage(rpc, account, { before, limit });
        if (batch.length === 0) break;
        for (const s of batch) sigs.push(s);
        if (batch.length < limit) break;
        before = batch[batch.length - 1].signature;
    }

    return sigs;
}

async function fetchTransactionsChunked(rpc: SolanaRpc, signatures: Signature[]) {
    const results: Array<Awaited<ReturnType<typeof getTransaction>>> = [];
    for (let i = 0; i < signatures.length; i += TX_BATCH_SIZE) {
        const chunk = signatures.slice(i, i + TX_BATCH_SIZE);
        const chunkResults = await Promise.all(chunk.map(sig => getTransaction(rpc, sig)));
        results.push(...chunkResults);
    }
    return results;
}
