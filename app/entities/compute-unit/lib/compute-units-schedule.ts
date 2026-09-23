import {
    getReservedComputeUnits as getPackageReservedComputeUnits,
    MAX_COMPUTE_UNITS,
    readComputeUnitLimitFromInstruction,
} from '@explorer/parsers/programs/compute-budget';
import { type Address, address, getBase58Encoder } from '@solana/kit';
import type { ParsedInstruction, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';

import { toSupportedCluster } from './cluster';

const BASE58_ENCODER = getBase58Encoder();

/**
 * Kept on the app's `Cluster` enum so the block and transaction pages need no edit yet.
 * Casts rather than validates: callers pass an arbitrary program ID string, and the old schedule
 * never rejected one either - it just fell through to the default reserve.
 */
export function getReservedComputeUnits({
    cluster,
    epoch,
    programId,
}: {
    cluster: Cluster;
    epoch?: bigint;
    programId: string;
}): number {
    return getPackageReservedComputeUnits({
        cluster: toSupportedCluster(cluster),
        epoch,
        programAddress: programId as Address,
    });
}

/** Estimates a transaction's requested compute units, from its compute budget instruction or the reserve schedule. */
export function estimateRequestedComputeUnits(
    tx: {
        transaction: {
            message: {
                compiledInstructions: Array<{
                    programIdIndex: number;
                    data: Uint8Array;
                }>;
                staticAccountKeys: PublicKey[];
            };
        };
        transactionConfig?: { computeUnitLimit?: number };
        version?: 'legacy' | 0 | 1;
    },
    epoch: bigint | undefined,
    cluster: Cluster,
): number {
    // v1 carries its compute unit limit in the message config.
    // An absent limit means zero.
    if (tx.version === 1) {
        return Math.min(tx.transactionConfig?.computeUnitLimit ?? 0, MAX_COMPUTE_UNITS);
    }

    let totalReservedUnits = 0;
    for (const instruction of tx.transaction.message.compiledInstructions) {
        const programId = tx.transaction.message.staticAccountKeys[instruction.programIdIndex];
        const requestedUnits = readComputeUnitLimitFromInstruction({
            accounts: [],
            data: instruction.data,
            programAddress: address(programId.toBase58()),
        });

        if (requestedUnits !== undefined) {
            totalReservedUnits = requestedUnits;
            break;
        } else {
            const reservedUnits = getReservedComputeUnits({
                cluster,
                epoch,
                programId: programId.toBase58(),
            });
            totalReservedUnits += reservedUnits;
        }
    }

    return Math.min(totalReservedUnits, MAX_COMPUTE_UNITS);
}

/** Estimates a parsed transaction's requested compute units, from its compute budget instruction or the schedule. */
export function estimateRequestedComputeUnitsForParsedTransaction(
    parsedTransaction: {
        message: {
            instructions: Array<ParsedInstruction | PartiallyDecodedInstruction>;
        };
    },
    epoch: bigint | undefined,
    cluster: Cluster,
): number {
    let totalReservedUnits = 0;
    for (const instruction of parsedTransaction.message.instructions) {
        // A partially decoded instruction carries base58 data.
        // A fully parsed one has none to read.
        if ('data' in instruction && typeof instruction.data === 'string') {
            const requestedUnits = readComputeUnitLimitFromInstruction({
                accounts: [],
                data: new Uint8Array(BASE58_ENCODER.encode(instruction.data)),
                programAddress: address(instruction.programId.toBase58()),
            });

            if (requestedUnits !== undefined) {
                totalReservedUnits = requestedUnits;
                break;
            }
        }
        const reservedUnits = getReservedComputeUnits({
            cluster,
            epoch,
            programId: instruction.programId.toBase58(),
        });
        totalReservedUnits += reservedUnits;
    }

    return Math.min(totalReservedUnits, MAX_COMPUTE_UNITS);
}
