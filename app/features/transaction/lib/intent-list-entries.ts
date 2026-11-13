import type { InstructionFetchResult, InstructionIntentListEntry } from '@entities/instruction-intent';
import { type RawTransaction, readRawInstructions } from '@entities/transaction-data';
import { toKitInstruction } from '@explorer/parsers/compat';
import { FetchStatus } from '@providers/cache';
import type { ParsedMessage, TransactionInstruction } from '@solana/web3.js';

export function toIntentListEntries({
    parsedInstructions,
    raw,
    rawFetchStatus,
}: {
    parsedInstructions: ParsedMessage['instructions'];
    raw: RawTransaction | null | undefined;
    rawFetchStatus: FetchStatus | undefined;
}): InstructionIntentListEntry[] {
    const rawInstructions = raw ? readRawInstructions(raw) : undefined;

    return parsedInstructions.map((instruction, index) => {
        const programId = instruction.programId.toBase58();
        return { ixFetchResult: toFetchResult(rawInstructions?.[index], programId, rawFetchStatus), programId };
    });
}

function toFetchResult(
    rawInstruction: TransactionInstruction | undefined,
    programId: string,
    rawFetchStatus: FetchStatus | undefined,
): InstructionFetchResult {
    if (rawInstruction) {
        return rawInstruction.programId.toBase58() === programId
            ? { instruction: toKitInstruction(rawInstruction), status: 'success' }
            : { status: 'failed' };
    }
    if (rawFetchStatus === undefined || rawFetchStatus === FetchStatus.Fetching) return { status: 'loading' };
    return { status: 'failed' };
}
