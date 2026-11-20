import { toLegacyPublicKey } from '@explorer/parsers/compat';
import type { ParsedTransaction, RawInstruction } from '@explorer/parsers/transaction';
import React from 'react';

import {
    BaseProgramLogsCardBody,
    type BaseProgramLogsCardBodyProps,
    type ProgramLogsInstruction,
} from './BaseProgramLogsCardBody';

export function ProgramLogsCardBody({
    transaction,
    ...props
}: Omit<BaseProgramLogsCardBodyProps, 'instructions'> & { transaction: ParsedTransaction<RawInstruction> }) {
    return <BaseProgramLogsCardBody instructions={transaction.instructions.map(toProgramLogsInstruction)} {...props} />;
}

function toProgramLogsInstruction(instruction: RawInstruction): ProgramLogsInstruction {
    return { data: instruction.data, programId: toLegacyPublicKey(instruction.programAddress) };
}
