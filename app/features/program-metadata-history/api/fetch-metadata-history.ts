import { buildHistory, fetchAccountTransactions, type History } from '@entities/account-history';
import { type Address, isSolanaError, SOLANA_ERROR__ACCOUNTS__ACCOUNT_NOT_FOUND } from '@solana/kit';
import { findCanonicalPda } from '@solana-program/program-metadata';

import { createMetadataHistoryBuilder } from '../lib/history-builder';
import type { MetadataEvent, MetadataState } from '../lib/types';

export type MetadataHistoryResult = History<MetadataEvent, MetadataState> & { pdaAddress: Address };

interface MetadataAccountNotFoundErrorOptions extends ErrorOptions {
    programAddress: Address;
    seed: string;
}

/** Thrown when canonical-PDA derivation can't find the program account on-chain. */
export class MetadataAccountNotFoundError extends Error {
    readonly programAddress: Address;
    readonly seed: string;

    constructor(message: string, options: MetadataAccountNotFoundErrorOptions) {
        super(message, options);
        this.name = 'MetadataAccountNotFoundError';
        this.programAddress = options.programAddress;
        this.seed = options.seed;
    }
}

/**
 * Fetch and reconstruct the full metadata history for a program + seed.
 *
 * Pipeline: PDA derivation → fetchAccountTransactions (I/O) → buildHistory (pure).
 */
export async function fetchMetadataHistory(
    programAddress: Address,
    seed: string,
    rpcUrl: string,
): Promise<MetadataHistoryResult> {
    let pda: Address;
    try {
        [pda] = await findCanonicalPda({ program: programAddress, seed });
    } catch (err) {
        // findCanonicalPda fetches the program account to read its upgrade authority; missing
        // program → SolanaError(ACCOUNT_NOT_FOUND). Surface a typed error so the UI can
        // discriminate without string-matching.
        if (isSolanaError(err, SOLANA_ERROR__ACCOUNTS__ACCOUNT_NOT_FOUND)) {
            throw new MetadataAccountNotFoundError(
                `No program-metadata account for program ${programAddress} (seed: ${seed})`,
                { cause: err, programAddress, seed },
            );
        }
        throw err;
    }
    const { transactions, truncated } = await fetchAccountTransactions(rpcUrl, pda);
    const snapshots = buildHistory(transactions, createMetadataHistoryBuilder());
    return { pdaAddress: pda, snapshots, totalSignatures: transactions.length, truncated };
}
