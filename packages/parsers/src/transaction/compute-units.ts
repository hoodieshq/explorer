import {
    getReservedComputeUnits,
    MAX_COMPUTE_UNITS,
    readComputeUnitLimitFromInstruction,
    type SupportedCluster,
} from '../programs/compute-budget/index.js';
import type { ParsedTransaction } from './types.js';

export type RequestedComputeUnits = {
    value: number;
    /**
     * `fallback` is v1's rule that an absent limit budgets zero, not an unknown value.
     * `declared` reads directly from the transaction, `calculated` sums per-program reserves.
     */
    source: 'declared' | 'fallback' | 'calculated';
};

export function getRequestedComputeUnits(
    transaction: ParsedTransaction,
    context: { cluster: SupportedCluster; epoch: bigint | undefined },
): RequestedComputeUnits {
    if (transaction.version === 1) {
        const declared = transaction.config?.computeUnitLimit;
        return declared === undefined
            ? { source: 'fallback', value: 0 }
            : { source: 'declared', value: Math.min(declared, MAX_COMPUTE_UNITS) };
    }

    let total = 0;
    for (const instruction of transaction.instructions) {
        const declared = readComputeUnitLimitFromInstruction(instruction);
        // An explicit limit replaces the reserves entirely, exactly as the runtime treats it.
        if (declared !== undefined) {
            return { source: 'declared', value: Math.min(declared, MAX_COMPUTE_UNITS) };
        }
        total += getReservedComputeUnits({
            cluster: context.cluster,
            epoch: context.epoch,
            programAddress: instruction.programAddress,
        });
    }

    return { source: 'calculated', value: Math.min(total, MAX_COMPUTE_UNITS) };
}
