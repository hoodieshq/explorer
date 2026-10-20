import type { InstructionFetchResult } from '@entities/instruction-intent';
import type { KitInstruction } from '@explorer/parsers';
import { FetchStatus } from '@providers/cache';

/**
 * The instruction one card on the transaction page builds its intent from, read from the raw transaction.
 */
export function toInstructionFetchResult({
    fetchStatus,
    instructions,
    index,
    programId,
}: {
    fetchStatus: FetchStatus | undefined;
    instructions: readonly (KitInstruction | undefined)[] | undefined;
    index: number;
    programId: string;
}): InstructionFetchResult {
    const instruction = instructions?.[index];
    if (instruction) {
        return instruction.programAddress === programId ? { instruction, status: 'success' } : { status: 'failed' };
    }
    if (fetchStatus === undefined || fetchStatus === FetchStatus.Fetching) return { status: 'loading' };
    return { status: 'failed' };
}
