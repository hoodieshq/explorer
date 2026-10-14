import {
    type Address,
    type AddressesByLookupTableAddress,
    appendTransactionMessageInstruction,
    blockhash,
    compileTransaction,
    compileTransactionMessage,
    compressTransactionMessageUsingAddressLookupTables,
    createTransactionMessage,
    getCompiledTransactionMessageEncoder,
    getTransactionEncoder,
    type Instruction,
    pipe,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
    type TransactionVersion,
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

/** Wire bytes of an unsigned transaction, with a zero-filled signature slot for every signer of the message. */
export function createUnsignedTransactionBytes(
    version: TransactionVersion,
    feePayer: Address,
    instruction: Instruction,
): Uint8Array {
    const message = pipe(
        createTransactionMessage({ version }),
        m => setTransactionMessageFeePayer(feePayer, m),
        m => setTransactionMessageLifetimeUsingBlockhash(LIFETIME, m),
        m => appendTransactionMessageInstruction(instruction, m),
    );
    return new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
}

export function createV0MessageBytes(
    feePayer: Address,
    instruction: Instruction,
    lookupTables: AddressesByLookupTableAddress = {},
): Uint8Array {
    const message = compressTransactionMessageUsingAddressLookupTables(
        createV0TransactionMessage(feePayer, instruction),
        lookupTables,
    );
    return new Uint8Array(getCompiledTransactionMessageEncoder().encode(compileTransactionMessage(message)));
}
