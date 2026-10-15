import type { ParsedInstruction, ParsedMessage, PartiallyDecodedInstruction } from '@solana/web3.js';
import React from 'react';

import { bytes } from '@/app/shared/lib/bytes';

import {
    BaseProgramLogsCardBody,
    type BaseProgramLogsCardBodyProps,
    type ProgramLogsInstruction,
} from './BaseProgramLogsCardBody';

export function Web3JsProgramLogsCardBody({
    message,
    ...props
}: Omit<BaseProgramLogsCardBodyProps, 'instructions'> & { message: ParsedMessage }) {
    return <BaseProgramLogsCardBody instructions={message.instructions.map(toProgramLogsInstruction)} {...props} />;
}

function toProgramLogsInstruction(
    instruction: ParsedInstruction | PartiallyDecodedInstruction,
): ProgramLogsInstruction {
    const { programId } = instruction;
    if ('parsed' in instruction) return { programId };

    return { data: bytes(instruction.data, 'base58'), programId };
}
