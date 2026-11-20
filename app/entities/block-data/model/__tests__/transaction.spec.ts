import {
    address,
    blockhash,
    type CompiledTransactionMessage,
    type CompiledTransactionMessageWithLifetime,
} from '@solana/kit';

import { getBlockTransactionInstructions } from '../transaction';

const ADDRESSES = [
    address('11111111111111111111111111111111'),
    address('Vote111111111111111111111111111111111111111'),
    address('Stake11111111111111111111111111111111111111'),
    address('ComputeBudget111111111111111111111111111111'),
] as const;

const LIFETIME_TOKEN = blockhash('11111111111111111111111111111111');

describe('getBlockTransactionInstructions', () => {
    it('should normalize legacy and v0 compiled instructions', () => {
        const message: CompiledTransactionMessage & CompiledTransactionMessageWithLifetime = {
            header: { numReadonlyNonSignerAccounts: 1, numReadonlySignerAccounts: 1, numSignerAccounts: 2 },
            instructions: [{ accountIndices: [0, 2], data: new Uint8Array([1, 2]), programAddressIndex: 3 }],
            lifetimeToken: LIFETIME_TOKEN,
            staticAccounts: ADDRESSES.slice(0, 4),
            version: 0,
        };

        expect(getBlockTransactionInstructions(message)).toEqual([
            { accountIndices: [0, 2], data: new Uint8Array([1, 2]), programAddressIndex: 3 },
        ]);
    });

    it('should pair v1 instruction headers with their payloads', () => {
        const message: CompiledTransactionMessage & CompiledTransactionMessageWithLifetime = {
            configMask: 0,
            configValues: [],
            header: { numReadonlyNonSignerAccounts: 0, numReadonlySignerAccounts: 0, numSignerAccounts: 1 },
            instructionHeaders: [{ numInstructionAccounts: 2, numInstructionDataBytes: 2, programAccountIndex: 1 }],
            instructionPayloads: [{ instructionAccountIndices: [0, 2], instructionData: new Uint8Array([3, 4]) }],
            lifetimeToken: LIFETIME_TOKEN,
            numInstructions: 1,
            numStaticAccounts: 3,
            staticAccounts: ADDRESSES.slice(0, 3),
            version: 1,
        };

        expect(getBlockTransactionInstructions(message)).toEqual([
            { accountIndices: [0, 2], data: new Uint8Array([3, 4]), programAddressIndex: 1 },
        ]);
    });
});
