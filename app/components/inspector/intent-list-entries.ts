import type { InstructionFetchResult, InstructionIntentListEntry } from '@entities/instruction-intent';
import type { VersionedMessage } from '@solana/web3.js';

import type { DecodedMessageResult } from './use-decoded-message';

export function toIntentListEntries(
    message: VersionedMessage,
    decodedMessage: DecodedMessageResult,
): InstructionIntentListEntry[] {
    const programIds = message.compiledInstructions.map(({ programIdIndex }) =>
        message.staticAccountKeys[programIdIndex]?.toBase58(),
    );
    // A gap would shift every "#N" away from its instruction card.
    if (programIds.some(programId => programId === undefined)) return [];

    return programIds.map((programId, index) => ({
        ixFetchResult: toFetchResult(decodedMessage, index),
        programId: programId as string,
    }));
}

function toFetchResult(decodedMessage: DecodedMessageResult, index: number): InstructionFetchResult {
    if (decodedMessage.status !== 'ready') return { status: decodedMessage.status };
    const instruction = decodedMessage.decoded.kitInstructions[index];
    return instruction ? { instruction, status: 'success' } : { status: 'failed' };
}
