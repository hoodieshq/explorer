import { address } from '@solana/kit';
import { Connection, PublicKey } from '@solana/web3.js';
import { findCanonicalPda } from '@solana-program/program-metadata';
import bs58 from 'bs58';

import { MAX_SIGNATURES, PROGRAM_METADATA_PROGRAM_ID, SIGNATURES_BATCH_SIZE, TX_FETCH_CONCURRENCY } from './constants';
import { parseMetadataTransaction } from './parse-metadata-instruction';
import { reconstructHistory } from './reconstruct-history';
import type { MetadataEvent, Snapshot } from './types';

export interface FetchProgressCallback {
    (phase: string): void;
}

export interface MetadataHistoryResult {
    pdaAddress: string;
    snapshots: Snapshot[];
    totalSignatures: number;
}

/**
 * Fetch and reconstruct the full metadata history for a program + seed.
 *
 * Pipeline: PDA derivation → signature fetching → transaction parsing → state replay.
 */
export async function fetchMetadataHistory(
    programAddress: string,
    seed: string,
    rpcUrl: string,
    onProgress?: FetchProgressCallback,
): Promise<MetadataHistoryResult> {
    onProgress?.('Deriving metadata PDA...');

    const [pda] = await findCanonicalPda({ program: address(programAddress), seed });
    const pdaPubkey = new PublicKey(pda);

    onProgress?.('Fetching transaction signatures...');

    const connection = new Connection(rpcUrl);
    const allSignatures = await fetchAllSignatures(connection, pdaPubkey, onProgress);

    if (allSignatures.length === 0) {
        return { pdaAddress: pda, snapshots: [], totalSignatures: 0 };
    }

    onProgress?.(`Parsing ${allSignatures.length} transactions...`);

    const events = await fetchAndParseTransactions(connection, allSignatures, onProgress);

    onProgress?.('Reconstructing state history...');

    const snapshots = reconstructHistory(events);

    return {
        pdaAddress: pda,
        snapshots,
        totalSignatures: allSignatures.length,
    };
}

async function fetchAllSignatures(
    connection: Connection,
    pda: PublicKey,
    onProgress?: FetchProgressCallback,
): Promise<SignatureInfo[]> {
    const allSigs: SignatureInfo[] = [];
    let before: string | undefined;

    while (allSigs.length < MAX_SIGNATURES) {
        const batch = await connection.getSignaturesForAddress(pda, {
            before,
            limit: SIGNATURES_BATCH_SIZE,
        });

        if (batch.length === 0) break;

        for (const sig of batch) {
            allSigs.push({
                blockTime: sig.blockTime ?? undefined,
                err: sig.err,
                signature: sig.signature,
                slot: sig.slot,
            });
        }

        before = batch[batch.length - 1].signature;
        onProgress?.(`Fetched ${allSigs.length} signatures...`);

        if (batch.length < SIGNATURES_BATCH_SIZE) break;
    }

    // Reverse to chronological order (RPC returns newest-first)
    allSigs.reverse();
    return allSigs;
}

interface SignatureInfo {
    signature: string;
    slot: number;
    blockTime: number | undefined;
    err: unknown;
}

async function fetchAndParseTransactions(
    connection: Connection,
    signatures: SignatureInfo[],
    onProgress?: FetchProgressCallback,
): Promise<MetadataEvent[]> {
    const allEvents: MetadataEvent[] = [];
    const programId = PROGRAM_METADATA_PROGRAM_ID;

    for (let i = 0; i < signatures.length; i += TX_FETCH_CONCURRENCY) {
        const batch = signatures.slice(i, i + TX_FETCH_CONCURRENCY);

        const txResults = await connection.getTransactions(
            batch.map((s) => s.signature),
            { maxSupportedTransactionVersion: 0 },
        );

        for (let j = 0; j < batch.length; j++) {
            const tx = txResults[j];
            const sigInfo = batch[j];

            if (!tx) continue;

            const instructions = extractInstructions(tx, programId);
            const events = parseMetadataTransaction({
                blockTime: sigInfo.blockTime,
                err: sigInfo.err,
                instructions,
                signature: sigInfo.signature,
                slot: sigInfo.slot,
            });

            allEvents.push(...events);
        }

        onProgress?.(`Parsed ${Math.min(i + TX_FETCH_CONCURRENCY, signatures.length)} / ${signatures.length} transactions...`);
    }

    return allEvents;
}

/**
 * Extract all instructions (outer + inner/CPI) from a versioned transaction response,
 * resolving account keys from address lookup tables.
 */
function extractInstructions(
    tx: NonNullable<Awaited<ReturnType<Connection['getTransaction']>>>,
    targetProgramId: string,
): Array<{ programId: string; data: string; accounts: string[] }> {
    const message = tx.transaction.message;
    const accountKeys = message.getAccountKeys({
        accountKeysFromLookups: tx.meta?.loadedAddresses,
    });

    const result: Array<{ programId: string; data: string; accounts: string[] }> = [];

    // Outer instructions
    const compiledIxs = message.compiledInstructions;
    for (const ix of compiledIxs) {
        const pid = accountKeys.get(ix.programIdIndex)?.toBase58() ?? '';
        if (pid !== targetProgramId) continue;

        result.push({
            accounts: ix.accountKeyIndexes.map((idx) => accountKeys.get(idx)?.toBase58() ?? ''),
            data: encodeBase58(ix.data),
            programId: pid,
        });
    }

    // Inner instructions (CPI)
    const innerInstructions = tx.meta?.innerInstructions ?? [];
    for (const inner of innerInstructions) {
        for (const ix of inner.instructions) {
            const pid = accountKeys.get(ix.programIdIndex)?.toBase58() ?? '';
            if (pid !== targetProgramId) continue;

            result.push({
                accounts: (ix.accounts ?? []).map((idx) => accountKeys.get(idx)?.toBase58() ?? ''),
                data: ix.data,
                programId: pid,
            });
        }
    }

    return result;
}

function encodeBase58(data: Uint8Array | number[]): string {
    return bs58.encode(data instanceof Uint8Array ? data : new Uint8Array(data));
}
