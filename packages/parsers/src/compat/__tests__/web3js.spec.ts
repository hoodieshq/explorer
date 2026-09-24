import { AccountRole } from '@solana/kit';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { gen } from '../../__tests__/gen.js';
import type { TransactionInstruction as PackageTransactionInstruction } from '../../transaction/types.js';
import { toKitAddress, toKitInstruction, toLegacyInstruction, toLegacyPublicKey } from '../index.js';

const PROGRAM_ID = new PublicKey(gen.tokenProgram);
const KEYS = [
    { isSigner: true, isWritable: true, pubkey: new PublicKey(gen.systemProgram) },
    {
        isSigner: true,
        isWritable: false,
        pubkey: new PublicKey(gen.sysvarRent),
    },
    {
        isSigner: false,
        isWritable: true,
        pubkey: new PublicKey(gen.sysvarClock),
    },
    {
        isSigner: false,
        isWritable: false,
        pubkey: new PublicKey(gen.voteProgram),
    },
];

describe('toKitInstruction', () => {
    it('should map every signer/writable combination onto kit account roles', () => {
        const kitIx = toKitInstruction(
            new TransactionInstruction({
                data: Buffer.from([1, 2]),
                keys: KEYS,
                programId: PROGRAM_ID,
            }),
        );

        expect(kitIx.programAddress).toBe(PROGRAM_ID.toBase58());
        expect(kitIx.data).toEqual(Buffer.from([1, 2]));
        expect(kitIx.accounts.map(account => account.role)).toEqual([
            AccountRole.WRITABLE_SIGNER,
            AccountRole.READONLY_SIGNER,
            AccountRole.WRITABLE,
            AccountRole.READONLY,
        ]);
        expect(kitIx.accounts.map(account => account.address)).toEqual(KEYS.map(key => key.pubkey.toBase58()));
    });
});

describe('address bridging', () => {
    it('should round-trip between kit addresses and legacy public keys', () => {
        const kitAddress = toKitAddress(PROGRAM_ID);

        expect(kitAddress).toBe(PROGRAM_ID.toBase58());
        expect(toLegacyPublicKey(kitAddress).equals(PROGRAM_ID)).toBe(true);
    });
});

describe('toLegacyInstruction', () => {
    const instruction: PackageTransactionInstruction = {
        accounts: [
            { address: gen.systemProgram, signer: true, source: 'static', writable: true },
            { address: gen.sysvarRent, signer: true, source: 'static', writable: false },
            { address: gen.sysvarClock, signer: false, source: 'static', writable: true },
            { address: gen.voteProgram, signer: false, source: 'static', writable: false },
        ],
        data: new Uint8Array([1, 2]),
        programAddress: gen.tokenProgram,
    };

    it('should preserve signer and writable flags through a round trip', () => {
        const kitIx = toKitInstruction(toLegacyInstruction(instruction));

        expect(kitIx.programAddress).toBe(instruction.programAddress);
        expect(kitIx.data).toEqual(Buffer.from([1, 2]));
        expect(kitIx.accounts.map(account => account.address)).toEqual(
            instruction.accounts.map(account => account.address),
        );
        expect(kitIx.accounts.map(account => account.role)).toEqual([
            AccountRole.WRITABLE_SIGNER,
            AccountRole.READONLY_SIGNER,
            AccountRole.WRITABLE,
            AccountRole.READONLY,
        ]);
    });

    it('should throw for an instruction with no data', () => {
        const parsedInstruction: PackageTransactionInstruction = { accounts: [], programAddress: gen.tokenProgram };

        expect(() => toLegacyInstruction(parsedInstruction)).toThrow(gen.tokenProgram);
    });
});
