// Bridges between @solana/web3.js v1 types and @solana/kit types.
// The explorer receives transaction data as web3.js v1 objects but
// @solana-program/* parsers expect kit-shaped instructions.

import { type AccountMeta, AccountRole, type Address, address } from '@solana/kit';
import { PublicKey, TransactionInstruction as Web3TransactionInstruction } from '@solana/web3.js';

import type { KitInstruction } from '../kit-instruction.js';
import type { TransactionInstruction } from '../transaction/types.js';

export function toKitInstruction(ix: Web3TransactionInstruction): KitInstruction {
    return {
        accounts: ix.keys.map(
            (key): AccountMeta => ({
                address: address(key.pubkey.toBase58()),
                role: toAccountRole(key.isSigner, key.isWritable),
            }),
        ),
        data: ix.data,
        programAddress: address(ix.programId.toBase58()),
    };
}

function toAccountRole(isSigner: boolean, isWritable: boolean): AccountRole {
    if (isSigner) return isWritable ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER;
    return isWritable ? AccountRole.WRITABLE : AccountRole.READONLY;
}

export function toLegacyPublicKey(addr: Address): PublicKey {
    return new PublicKey(addr);
}

export function toKitAddress(pubkey: PublicKey): Address {
    return address(pubkey.toBase58());
}

/** `TransactionInstruction` -> web3.js `TransactionInstruction`. */
export function toLegacyInstruction(instruction: TransactionInstruction): Web3TransactionInstruction {
    if (instruction.data === undefined) {
        // A jsonParsed instruction carries no raw bytes, so there is no data to convert.
        throw new Error(`Cannot convert instruction for program ${instruction.programAddress}: data is absent`);
    }

    return new Web3TransactionInstruction({
        data: Buffer.from(instruction.data),
        keys: instruction.accounts.map(account => ({
            isSigner: account.signer,
            isWritable: account.writable,
            pubkey: toLegacyPublicKey(account.address),
        })),
        programId: toLegacyPublicKey(instruction.programAddress),
    });
}
