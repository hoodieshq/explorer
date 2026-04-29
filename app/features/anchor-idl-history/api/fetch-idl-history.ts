import { idlAddress } from '@coral-xyz/anchor/dist/cjs/idl';
import {
    buildHistory,
    fetchAccountTransactions,
    type History,
    type HistoryEventBase,
    type RawTransaction,
} from '@entities/account-history';
import { type Address } from '@solana/kit';

import { toAddress, toPublicKey } from '@/app/shared/lib/web3js-compat';

import { createAnchorIdlHistoryBuilder, replayBufferWrites } from '../lib/history-builder';
import { parseAnchorIdlTransaction } from '../lib/parse-idl-instruction';
import { type AnchorIdlEvent, type AnchorIdlState, InstructionType } from '../lib/types';

export type AnchorIdlHistoryResult = History<AnchorIdlEvent, AnchorIdlState> & { idlAddress: Address };

/**
 * Fetch and reconstruct the full Anchor IDL history for a program.
 *
 * Pipeline: idlAddress derivation → fetchAccountTransactions (I/O) → resolve foreign buffers
 * referenced by SetBuffer (parallel I/O) → buildHistory (pure).
 */
export async function fetchAnchorIdlHistory(programAddress: Address, rpcUrl: string): Promise<AnchorIdlHistoryResult> {
    // `idlAddress` from @coral-xyz/anchor still returns a web3.js PublicKey; bridge to kit Address.
    const idlAddr = toAddress(await idlAddress(toPublicKey(programAddress)));

    const { transactions, truncated } = await fetchAccountTransactions(rpcUrl, idlAddr);
    const bufferContents = await resolveSetBufferContents(rpcUrl, transactions, programAddress);
    const snapshots = buildHistory(transactions, createAnchorIdlHistoryBuilder(programAddress, { bufferContents }));
    return { idlAddress: idlAddr, snapshots, totalSignatures: transactions.length, truncated };
}

/**
 * For every SetBuffer event in the IDL history, fetch the source buffer account's transactions
 * and replay its Writes to recover the bytes it held when consumed. Returns a `signature → bytes`
 * lookup keyed on each SetBuffer's transaction signature, ready for the builder.
 *
 * One unique buffer is fetched at most once even if it's consumed multiple times. If a buffer's
 * fetch fails (truncated history, network error), it's silently skipped — the builder will keep
 * `content` undefined for that snapshot.
 */
async function resolveSetBufferContents(
    rpcUrl: string,
    idlTransactions: RawTransaction[],
    programAddress: Address,
): Promise<Map<string, Uint8Array>> {
    const setBuffers = collectSetBufferEvents(idlTransactions, programAddress);
    if (setBuffers.length === 0) return new Map();

    const uniqueBuffers = [...new Set(setBuffers.map(e => e.bufferAccount).filter((a): a is string => Boolean(a)))];
    const bufferBytesByAddr = new Map<string, Uint8Array>();
    await Promise.all(
        uniqueBuffers.map(async addr => {
            try {
                // The buffer account address is a kit Address brand at runtime — pass it through.
                const { transactions: bufferTxs } = await fetchAccountTransactions(rpcUrl, addr as Address);
                bufferBytesByAddr.set(addr, replayBufferWrites(bufferTxs, programAddress));
            } catch {
                // Network error or RPC quirk — skip; snapshot will fall back to content=undefined.
            }
        }),
    );

    const result = new Map<string, Uint8Array>();
    for (const sb of setBuffers) {
        if (!sb.bufferAccount) continue;
        const bytes = bufferBytesByAddr.get(sb.bufferAccount);
        if (bytes) result.set(sb.signature, bytes);
    }
    return result;
}

function collectSetBufferEvents(transactions: RawTransaction[], programAddress: Address): AnchorIdlEvent[] {
    const out: AnchorIdlEvent[] = [];
    for (const { info, transaction } of transactions) {
        const base: HistoryEventBase = {
            blockTime: info.blockTime !== null ? Number(info.blockTime) : undefined,
            failed: info.err !== null && info.err !== undefined,
            signature: info.signature,
            slot: Number(info.slot),
        };
        for (const event of parseAnchorIdlTransaction(transaction, base, programAddress)) {
            if (event.instructionType === InstructionType.SetBuffer) out.push(event);
        }
    }
    return out;
}
