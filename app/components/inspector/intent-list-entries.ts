import type { InstructionFetchResult, InstructionIntentListEntry } from '@entities/instruction-intent';
import { toKitInstruction } from '@explorer/parsers/compat';
import type { VersionedMessage } from '@solana/web3.js';

import type { DecodedMessageResult } from './use-decoded-message';

export function toIntentListEntries(
    message: VersionedMessage,
    decodedMessage: DecodedMessageResult,
): InstructionIntentListEntry[] {
    const programIds = message.compiledInstructions.flatMap(
        ({ programIdIndex }) => message.staticAccountKeys.at(programIdIndex)?.toBase58() ?? [],
    );
    // Rows number themselves by position, so a skipped instruction would mislabel every row after it
    if (programIds.length !== message.compiledInstructions.length) return [];

    return programIds.map((programId, index) => ({ ixFetchResult: toFetchResult(decodedMessage, index), programId }));
}

function toFetchResult(decodedMessage: DecodedMessageResult, index: number): InstructionFetchResult {
    if (decodedMessage.status !== 'ready') return { status: decodedMessage.status };
    const instruction = decodedMessage.decoded.instructions[index];
    return instruction ? { instruction: toKitInstruction(instruction), status: 'success' } : { status: 'failed' };
}
