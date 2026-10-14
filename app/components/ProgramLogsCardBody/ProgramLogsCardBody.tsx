import { toLegacyPublicKey } from '@explorer/parsers/compat';
import {
    isRpcParsedInstruction,
    type ParsedTransaction,
    type TransactionInstruction,
} from '@explorer/parsers/transaction';
import React from 'react';

import {
    BaseProgramLogsCardBody,
    type BaseProgramLogsCardBodyProps,
    type ProgramLogsInstruction,
} from './BaseProgramLogsCardBody';

export function ProgramLogsCardBody({
    transaction,
    ...props
}: Omit<BaseProgramLogsCardBodyProps, 'instructions'> & { transaction: ParsedTransaction }) {
    return <BaseProgramLogsCardBody instructions={transaction.instructions.map(toProgramLogsInstruction)} {...props} />;
}

function toProgramLogsInstruction(instruction: TransactionInstruction): ProgramLogsInstruction {
    const programId = toLegacyPublicKey(instruction.programAddress);
    if (isRpcParsedInstruction(instruction)) return { programId };

    return { data: instruction.data, programId };
}
