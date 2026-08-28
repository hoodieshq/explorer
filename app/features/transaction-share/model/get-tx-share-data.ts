import {
    applyNameSourcesToSummaries,
    findTransactionCluster,
    formatTransactionVersion,
    getInstructionSummaries,
    type InstructionSummary,
    type TransactionWithMeta,
} from '@entities/transaction-data';
import { Cluster, type ServerCluster } from '@utils/cluster';
import { displayTimestampUtc, unixTimestampToMs } from '@utils/date';
import { lamportsToSolString } from '@utils/index';

import { Logger } from '@/app/shared/lib/logger';

import { getTx } from '../api/get-tx';

/**
 * Data for the OG image rendering, already formatted.
 *
 * Optional means the response can genuinely omit it, and the image drops that footer cell rather than
 * printing a placeholder. There is no wire size here: it is the one footer field the `jsonParsed`
 * encoding does not carry, so it would cost a second `base64` fetch.
 */
export type TxShareData = {
    signature: string;
    /** "Aug 31, 2026 at 11:00:00 UTC" */
    dateUtc: string;
    /** "0.000005 SOL" */
    fee: string;
    status: 'success' | 'failed';
    instructions: InstructionSummary[];
    /** Required: every transaction the RPC returns was confirmed in a slot. */
    slot: number;
    /** Read from the first account key, which a message with none would not have. */
    signer?: string;
    computeUnits?: number;
    version?: string;
};

type ErrorResult = { kind: 'error' };
type NotFoundResult = { kind: 'not-found' };
/**
 * The shaped transaction, or the reason there is none. `not-found` and `error` stay separate because
 * the route answers them differently: a missing transaction still renders the fallback image.
 */
export type TxShareResult = { kind: 'ok'; data: TxShareData } | ErrorResult | NotFoundResult;

/**
 * The data behind `/og/tx/<signature>`, read from the cluster the link named or from the one the probe
 * finds.
 *
 * The one place a cluster is decided, which is what lets `getTx` take a required one. Never throws:
 * every failure becomes a result the route turns into a status code.
 * @param signature - The transaction signature from the route
 * @param cluster - The cluster from `?cluster=`, absent when the link carried none
 */
export async function getTxShareData(signature: string, cluster?: ServerCluster): Promise<TxShareResult> {
    try {
        const resolved = await resolveCluster(signature, cluster);
        if (resolved.kind !== 'found') return resolved;

        const tx = await getTx({ cluster: resolved.cluster, signature });
        if (!tx) return { kind: 'not-found' };

        return { data: toShareData(signature, tx), kind: 'ok' };
    } catch (error) {
        Logger.error(error, { signature });
        return { kind: 'error' };
    }
}

/** The cluster to read from, or the same failure shape `getTxShareData` returns. */
type ResolvedCluster = { kind: 'found'; cluster: ServerCluster } | NotFoundResult | ErrorResult;

/**
 * Clusters to probe, in order, when the link carried no `?cluster=`.
 *
 * Mainnet first because it is the overwhelming majority and an absent param means mainnet by the app's own
 * contract - `parseQuery` falls back to `DEFAULT_CLUSTER`. Unlike receipt, this feature has no probe flag, so
 * the list is fixed.
 */
const PROBE_ORDER: readonly ServerCluster[] = [Cluster.MainnetBeta, Cluster.Devnet, Cluster.Testnet];

/**
 * The caller's cluster when the link carried one, otherwise the entity's probe. A probe that could not
 * reach a cluster is a 502, the status the receipt route already returns for that failure.
 */
async function resolveCluster(signature: string, cluster?: ServerCluster): Promise<ResolvedCluster> {
    if (cluster !== undefined) return { cluster, kind: 'found' };

    const result = await findTransactionCluster(PROBE_ORDER, signature);

    switch (result.kind) {
        case 'found':
            return { cluster: result.cluster, kind: 'found' };
        case 'not-found':
            Logger.info('[transaction-share] No cluster carries the signature', { signature });
            return result;
        case 'error':
            Logger.error(result.error, { cluster: result.cluster, signature });
            return { kind: 'error' };
    }
}

/**
 * The fields the image prints.
 *
 * The empty IDL map is the finished call, not a stub: per the entity README an empty map means "no
 * IDL", never "nothing is named yet". Every byte-level source still runs, so Compute Budget, Memo, ZK
 * ElGamal, Lighthouse, Mango, Serum and the `@solana-program/*` clients all name with no network call.
 * Passing a populated map is a follow-up and changes nothing else here.
 */
function toShareData(signature: string, tx: TransactionWithMeta): TxShareData {
    const summaries = getInstructionSummaries(tx);
    const instructions = applyNameSourcesToSummaries(summaries, new Map());

    return {
        computeUnits: tx.meta?.computeUnitsConsumed,
        dateUtc: formatDateUtc(tx.blockTime),
        // `meta` is absent only when the RPC returned no execution result, which a confirmed
        // transaction always carries. Zero keeps the row printable instead of blanking it.
        fee: `${lamportsToSolString(tx.meta?.fee ?? 0)} SOL`,
        instructions,
        signature,
        // The fee payer is always the first account key, which is what the detail card reads too.
        signer: tx.transaction.message.accountKeys[0]?.pubkey.toBase58(),
        slot: tx.slot,
        // Absent metadata carries no execution result, which is not a success, so it reads as failed.
        status: tx.meta?.err === null ? 'success' : 'failed',
        version: tx.version === undefined ? undefined : formatTransactionVersion(tx.version),
    };
}

/** The same placeholder the transaction-history row prints for a transaction with no block time. */
function formatDateUtc(blockTime: number | null | undefined): string {
    if (!blockTime) return '-';
    return displayTimestampUtc(unixTimestampToMs(blockTime), true);
}
