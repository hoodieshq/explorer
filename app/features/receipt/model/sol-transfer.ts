import { type ParsedInstruction, type ParsedTransactionWithMeta, SystemProgram } from '@solana/web3.js';
import { validate } from 'superstruct';

import { extractMemoFromTransaction } from './memo';
import { SolTransferPayload } from './schemas';
import type { ReceiptSol } from './types';

type SolTransferParsed = {
    type: 'transfer';
    info: {
        source?: string;
        destination?: string;
        lamports?: number;
    };
};

type SolTransferInstruction = ParsedInstruction & { parsed: SolTransferParsed };

export function createSolTransferReceipt(transaction: ParsedTransactionWithMeta): ReceiptSol | null {
    const instruction = getSingleSolTransferInstruction(transaction);
    if (!instruction) return null;

    const raw = extractSolTransferPayload(transaction, instruction);

    const [err, validated] = validate(raw, SolTransferPayload);
    if (err) {
        console.error('Error validating sol transfer payload', err);
        return null;
    }

    return {
        ...validated,
        memo: raw.memo,
        type: 'sol',
    };
}

function getSingleSolTransferInstruction(transaction: ParsedTransactionWithMeta): SolTransferInstruction | null {
    const instructions = transaction.transaction.message.instructions.filter(
        (instruction): instruction is SolTransferInstruction =>
            SystemProgram.programId.equals(instruction.programId) &&
            'parsed' in instruction &&
            instruction.parsed.type === 'transfer'
    );
    return instructions.length === 1 ? instructions[0] : null;
}

function extractSolTransferPayload(transaction: ParsedTransactionWithMeta, instruction: SolTransferInstruction) {
    const { info } = instruction.parsed;
    return {
        date: transaction.blockTime ?? undefined,
        fee: transaction.meta?.fee,
        memo: extractMemoFromTransaction(transaction),
        receiver: info.destination,
        sender: info.source,
        total: info.lamports,
    };
}
