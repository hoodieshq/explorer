import type { TransactionVersion } from '@solana/kit';

/**
 * A transaction version as the UI writes it: `legacy` bare, every numbered version `v`-prefixed.
 *
 * Shared rather than local because the transaction detail card and the OG image must not word the same
 * transaction differently.
 */
export function formatTransactionVersion(version: TransactionVersion): string {
    return version === 'legacy' ? version : `v${version}`;
}
