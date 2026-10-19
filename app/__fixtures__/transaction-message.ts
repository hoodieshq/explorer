import {
    type Address,
    appendTransactionMessageInstruction,
    blockhash,
    compileTransaction,
    compileTransactionMessage,
    createTransactionMessage,
    getTransactionEncoder,
    type Instruction,
    pipe,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';

import { gen } from './gen';

const LIFETIME = { blockhash: blockhash(gen.blockhash()), lastValidBlockHeight: 100n };

function createV0TransactionMessage(feePayer: Address, instruction: Instruction) {
    return pipe(
        createTransactionMessage({ version: 0 }),
        m => setTransactionMessageFeePayer(feePayer, m),
        m => setTransactionMessageLifetimeUsingBlockhash(LIFETIME, m),
        m => appendTransactionMessageInstruction(instruction, m),
    );
}

export function compileV0TransactionMessage(feePayer: Address, instruction: Instruction) {
    return compileTransactionMessage(createV0TransactionMessage(feePayer, instruction));
}

export function createV0TransactionBytes(feePayer: Address, instruction: Instruction): Uint8Array {
    const transaction = compileTransaction(createV0TransactionMessage(feePayer, instruction));
    return new Uint8Array(getTransactionEncoder().encode(transaction));
}
