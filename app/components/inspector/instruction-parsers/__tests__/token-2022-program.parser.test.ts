import { address, createNoopSigner } from '@solana/kit';
import { Keypair } from '@solana/web3.js';
import {
    getInitializeGroupMemberPointerInstruction,
    getInitializeGroupPointerInstruction,
    getInitializeMetadataPointerInstruction,
    getInitializeMintInstruction,
    getUpdateGroupMemberPointerInstruction,
    getUpdateGroupPointerInstruction,
    getUpdateMetadataPointerInstruction,
} from '@solana-program/token-2022';
import { describe, expect, it } from 'vitest';

import { TInstruction } from '../../into-parsed-data';
import { parseToken2022InstructionData } from '../token-2022-program.parser';

function randomAddress() {
    return address(Keypair.generate().publicKey.toBase58());
}

describe('parseToken2022InstructionData', () => {
    describe('InitializeMint', () => {
        it('parses InitializeMint instruction correctly', () => {
            const mint = randomAddress();
            const mintAuthority = randomAddress();
            const freezeAuthority = randomAddress();
            const rent = address('SysvarRent111111111111111111111111111111111');
            const decimals = 9;

            const ix = getInitializeMintInstruction({
                decimals,
                freezeAuthority,
                mint,
                mintAuthority,
                rent,
            });

            const result = parseToken2022InstructionData(ix as unknown as TInstruction);

            expect(result).not.toBeNull();
            expect(result?.type).toBe('initializeMint');
            expect(result?.info.decimals).toBe(decimals);
            expect(result?.info.mint.toBase58()).toBe(mint);
            expect(result?.info.mintAuthority.toBase58()).toBe(mintAuthority);
            expect(result?.info.freezeAuthority?.toBase58()).toBe(freezeAuthority);
            expect(result?.info.rentSysvar.toBase58()).toBe(rent);
        });
    });

    describe('InitializeMetadataPointer', () => {
        it('parses InitializeMetadataPointer instruction correctly', () => {
            const mint = randomAddress();
            const authority = randomAddress();
            const metadataAddress = randomAddress();

            const ix = getInitializeMetadataPointerInstruction({
                authority,
                metadataAddress,
                mint,
            });

            const result = parseToken2022InstructionData(ix as unknown as TInstruction);

            expect(result).not.toBeNull();
            expect(result?.type).toBe('initializeMetadataPointer');
            expect(result?.info.mint.toBase58()).toBe(mint);
            expect(result?.info.authority.toBase58()).toBe(authority);
            expect(result?.info.metadataAddress.toBase58()).toBe(metadataAddress);
        });
    });

    describe('UpdateMetadataPointer', () => {
        it('parses UpdateMetadataPointer instruction correctly', () => {
            const mint = randomAddress();
            const metadataPointerAuthority = randomAddress();
            const metadataAddress = randomAddress();

            const ix = getUpdateMetadataPointerInstruction({
                metadataAddress,
                metadataPointerAuthority: createNoopSigner(metadataPointerAuthority),
                mint,
            });

            const result = parseToken2022InstructionData(ix as unknown as TInstruction);

            expect(result).not.toBeNull();
            expect(result?.type).toBe('updateMetadataPointer');
            expect(result?.info.mint.toBase58()).toBe(mint);
            expect(result?.info.authority.toBase58()).toBe(metadataPointerAuthority);
            expect(result?.info.metadataAddress?.toBase58()).toBe(metadataAddress);
        });
    });

    describe('InitializeGroupPointer', () => {
        it('parses InitializeGroupPointer instruction correctly', () => {
            const mint = randomAddress();
            const authority = randomAddress();
            const groupAddress = randomAddress();

            const ix = getInitializeGroupPointerInstruction({
                authority,
                groupAddress,
                mint,
            });

            const result = parseToken2022InstructionData(ix as unknown as TInstruction);

            expect(result).not.toBeNull();
            expect(result?.type).toBe('initializeGroupPointer');
            expect(result?.info.mint.toBase58()).toBe(mint);
            expect(result?.info.authority.toBase58()).toBe(authority);
            expect(result?.info.groupAddress.toBase58()).toBe(groupAddress);
        });
    });

    describe('UpdateGroupPointer', () => {
        it('parses UpdateGroupPointer instruction correctly', () => {
            const mint = randomAddress();
            const groupPointerAuthority = randomAddress();
            const groupAddress = randomAddress();

            const ix = getUpdateGroupPointerInstruction({
                groupAddress,
                groupPointerAuthority: createNoopSigner(groupPointerAuthority),
                mint,
            });

            const result = parseToken2022InstructionData(ix as unknown as TInstruction);

            expect(result).not.toBeNull();
            expect(result?.type).toBe('updateGroupPointer');
            expect(result?.info.mint.toBase58()).toBe(mint);
            expect(result?.info.authority.toBase58()).toBe(groupPointerAuthority);
            expect(result?.info.groupAddress?.toBase58()).toBe(groupAddress);
        });
    });

    describe('InitializeGroupMemberPointer', () => {
        it('parses InitializeGroupMemberPointer instruction correctly', () => {
            const mint = randomAddress();
            const authority = randomAddress();
            const memberAddress = randomAddress();

            const ix = getInitializeGroupMemberPointerInstruction({
                authority,
                memberAddress,
                mint,
            });

            const result = parseToken2022InstructionData(ix as unknown as TInstruction);

            expect(result).not.toBeNull();
            expect(result?.type).toBe('initializeGroupMemberPointer');
            expect(result?.info.mint.toBase58()).toBe(mint);
            expect(result?.info.authority.toBase58()).toBe(authority);
            expect(result?.info.memberAddress.toBase58()).toBe(memberAddress);
        });
    });

    describe('UpdateGroupMemberPointer', () => {
        it('parses UpdateGroupMemberPointer instruction correctly', () => {
            const mint = randomAddress();
            const groupMemberPointerAuthority = randomAddress();
            const memberAddress = randomAddress();

            const ix = getUpdateGroupMemberPointerInstruction({
                groupMemberPointerAuthority: createNoopSigner(groupMemberPointerAuthority),
                memberAddress,
                mint,
            });

            const result = parseToken2022InstructionData(ix as unknown as TInstruction);

            expect(result).not.toBeNull();
            expect(result?.type).toBe('updateGroupMemberPointer');
            expect(result?.info.mint.toBase58()).toBe(mint);
            expect(result?.info.authority.toBase58()).toBe(groupMemberPointerAuthority);
            expect(result?.info.memberAddress?.toBase58()).toBe(memberAddress);
        });
    });

    describe('Unknown instruction', () => {
        it('returns null for unknown instruction', () => {
            const ix = {
                accounts: [],
                data: new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]),
                programAddress: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
            };

            const result = parseToken2022InstructionData(ix);

            expect(result).toBeNull();
        });
    });

    describe('Edge cases', () => {
        it('handles empty data gracefully', () => {
            const ix = {
                accounts: [],
                data: new Uint8Array([]),
                programAddress: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
            };

            const result = parseToken2022InstructionData(ix);

            expect(result).toBeNull();
        });
    });
});
