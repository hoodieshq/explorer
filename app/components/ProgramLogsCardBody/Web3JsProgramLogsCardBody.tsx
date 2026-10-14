import { getBase58Encoder } from '@solana/kit';
import type { ParsedInstruction, ParsedMessage, PartiallyDecodedInstruction } from '@solana/web3.js';
import React from 'react';

import {
    BaseProgramLogsCardBody,
    type BaseProgramLogsCardBodyProps,
    type ProgramLogsInstruction,
} from './BaseProgramLogsCardBody';

const BASE58_ENCODER = getBase58Encoder();

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

    return { data: new Uint8Array(BASE58_ENCODER.encode(instruction.data)), programId };
}
