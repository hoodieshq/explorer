import { getTransactionConfig } from './config.js';
import { LAMPORTS_PER_SIGNATURE } from './constants.js';
import type { ParsedTransaction } from './types.js';

/**
 * Priority fee from legacy or v0 transactions.
 * Floored at 0 for clusters whose fee per signature is below 5,000.
 * Includes 5,000 per precompile signature, since `signatureCount` omits those.
 */
export function derivePriorityFeeLamports({
    feeLamports,
    signatureCount,
}: {
    feeLamports: number;
    signatureCount: number;
}): number {
    return Math.max(0, feeLamports - LAMPORTS_PER_SIGNATURE * signatureCount);
}

/**
 * The priority fee a transaction pays, in lamports.
 *
 * - v1 declares the total on the message.
 * - Legacy and v0 txs price per compute unit, so their total must be derived from the fee reported by the RPC.
 *
 * `undefined` covers two cases:
 * - a v1 message that declares no fee.
 * - a legacy or v0 tx whose RPC fee is unknown.
 */
export function resolvePriorityFeeLamports(
    transaction: ParsedTransaction,
    meta: { feeLamports: number | undefined },
): number | undefined {
    const declared = getTransactionConfig(transaction)?.priorityFeeLamports;
    if (transaction.version === 1) {
        return declared === undefined ? undefined : Number(declared);
    }
    if (meta.feeLamports === undefined) {
        return undefined;
    }

    return derivePriorityFeeLamports({
        feeLamports: meta.feeLamports,
        signatureCount: transaction.numSignerAccounts,
    });
}
