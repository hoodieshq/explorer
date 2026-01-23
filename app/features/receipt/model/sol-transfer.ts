import type { ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from '@solana/web3.js';

import { extractMemoFromTransaction } from './memo';
import type { ReceiptSol } from './types';

type SolTransferParsed = {
    type: 'transfer';
    info: {
        source?: string;
        destination?: string;
        lamports?: number;
    };
};

export function createSolTransferReceipt(transaction: ParsedTransactionWithMeta): ReceiptSol | null {
    const instructions = findSolTransferInstructions(transaction);

    // There is a requirement to support only one SOL transfer instruction in a transaction
    if (instructions.length !== 1) {
        return null;
    }
    const instruction = instructions[0];
    if (!('parsed' in instruction)) {
        return null;
    }

    const parsed: SolTransferParsed = instruction.parsed;

    const sender = parsed.info.source;
    const receiver = parsed.info.destination;
    const fee = transaction.meta?.fee;
    const date = transaction.blockTime;
    const memo = extractMemoFromTransaction(transaction);
    const total = parsed.info.lamports;

    if (!total || !fee || !date || !sender || !receiver) {
        return null;
    }

    return {
        date,
        fee,
        memo,
        receiver,
        sender,
        total,
        type: 'sol',
    };
}

function findSolTransferInstructions(
    transaction: ParsedTransactionWithMeta
): (ParsedInstruction | PartiallyDecodedInstruction)[] {
    const { transaction: tx } = transaction;
    const instructions = tx.message.instructions.filter(
        instruction => 'parsed' in instruction && instruction.parsed.type === 'transfer'
    );
    return instructions;
}
