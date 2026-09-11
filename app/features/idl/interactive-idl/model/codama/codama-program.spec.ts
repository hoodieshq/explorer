import { readFileSync } from 'node:fs';
import path from 'node:path';

import { gen } from '@__fixtures__/gen';
import { createProgramClient } from '@codama/dynamic-client';
import { type Address, address, lamports, type MaybeEncodedAccount } from '@solana/kit';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import type { RootNode } from 'codama';
import { describe, expect, it, vi } from 'vitest';

import { encodeMint } from '../__mocks__/codama/encode-mint';
import type { BaseIdl } from '../unified-program.d';
import { CodamaUnifiedProgram } from './codama-program';

function loadIdl(filename: string): RootNode {
    const idlPath = path.resolve(__dirname, '../__mocks__/codama', filename);
    return JSON.parse(readFileSync(idlPath, 'utf8')) as RootNode;
}

function createProgram(idl: RootNode, programId?: PublicKey) {
    const pubkey = programId ?? PublicKey.default;
    const client = createProgramClient(idl, { programId: pubkey.toBase58() });
    return new CodamaUnifiedProgram(pubkey, idl as unknown as BaseIdl, client);
}

describe('CodamaUnifiedProgram', () => {
    const systemIdl = loadIdl('system-program-idl.json');
    const votingIdl = loadIdl('codama-voting.json');

    describe('properties', () => {
        it('should expose programId', () => {
            const pubkey = new PublicKey('Htp9MGP8Tig923ZFY7Qf2zzbMUmYneFRAhSp7vSg4wxV');
            const program = createProgram(systemIdl, pubkey);
            expect(program.programId).toEqual(pubkey);
        });

        it('should expose idl', () => {
            const program = createProgram(systemIdl);
            expect(program.idl).toBeDefined();
        });
    });

    describe('getClient', () => {
        it('should return ProgramClient with instructions', () => {
            const program = createProgram(systemIdl);
            const client = program.getClient();
            expect(client).toBeDefined();
            expect(client.instructions.size).toBeGreaterThan(0);
        });

        it('should have transferSol instruction', () => {
            const program = createProgram(systemIdl);
            expect(program.getClient().instructions.has('transferSol')).toBe(true);
        });
    });

    describe('buildInstruction', () => {
        it('should build a valid TransactionInstruction', async () => {
            const program = createProgram(systemIdl);
            const source = 'Htp9MGP8Tig923ZFY7Qf2zzbMUmYneFRAhSp7vSg4wxV';
            const destination = '2xNweLHLKifGNBhLp2giBonGDJ3dPAHpSTaMJmfcMon8';

            const ix = await program.buildInstruction(
                'transferSol',
                {
                    destination: new PublicKey(destination),
                    source: new PublicKey(source),
                },
                ['1000000'],
            );

            expect(ix).toBeInstanceOf(TransactionInstruction);
            expect(ix.programId).toEqual(PublicKey.default);
            expect(ix.keys).toHaveLength(2);
            expect(ix.data.length).toBeGreaterThan(0);
        });

        it('should set correct account roles (signer, writable)', async () => {
            const program = createProgram(systemIdl);
            const source = new PublicKey('Htp9MGP8Tig923ZFY7Qf2zzbMUmYneFRAhSp7vSg4wxV');
            const destination = new PublicKey('2xNweLHLKifGNBhLp2giBonGDJ3dPAHpSTaMJmfcMon8');

            const ix = await program.buildInstruction('transferSol', { destination, source }, ['500']);

            // Both source and destination are writable signers for transferSol
            const sourceKey = ix.keys.find(k => k.pubkey.equals(source));
            expect(sourceKey?.isSigner).toBe(true);
            expect(sourceKey?.isWritable).toBe(true);
        });

        it('should convert string amounts to BigInt for u64 args', async () => {
            const program = createProgram(systemIdl);
            const source = new PublicKey('Htp9MGP8Tig923ZFY7Qf2zzbMUmYneFRAhSp7vSg4wxV');
            const destination = new PublicKey('2xNweLHLKifGNBhLp2giBonGDJ3dPAHpSTaMJmfcMon8');

            // Large value that exceeds Number.MAX_SAFE_INTEGER
            const ix = await program.buildInstruction('transferSol', { destination, source }, ['9999999999999999999']);

            expect(ix).toBeInstanceOf(TransactionInstruction);
            expect(ix.data.length).toBeGreaterThan(0);
        });

        it('should handle null accounts by passing null address', async () => {
            const program = createProgram(systemIdl);
            const source = new PublicKey('Htp9MGP8Tig923ZFY7Qf2zzbMUmYneFRAhSp7vSg4wxV');

            // Passing null for destination
            await expect(
                program.buildInstruction('transferSol', { destination: null, source }, ['1000']),
            ).rejects.toThrow();
        });

        it('should throw for unknown instruction name', async () => {
            const program = createProgram(systemIdl);

            await expect(program.buildInstruction('fakeInstruction', {}, [])).rejects.toThrow(
                'Instruction "fakeInstruction" not found',
            );
        });

        it('should include available instruction names in error message', async () => {
            const program = createProgram(systemIdl);

            // eslint-disable-next-line no-restricted-syntax -- regex needed to match partial error message
            await expect(program.buildInstruction('fakeInstruction', {}, [])).rejects.toThrow(/Available:/);
        });

        it('should filter omitted arguments (discriminators)', async () => {
            const program = createProgram(votingIdl);
            const signer = new PublicKey('Htp9MGP8Tig923ZFY7Qf2zzbMUmYneFRAhSp7vSg4wxV');

            // initializeCandidate has 3 arguments: discriminator (omitted), candidateName, pollId
            // Only 2 user-facing args should be expected
            const ix = await program.buildInstruction(
                'initializeCandidate',
                {
                    candidate: new PublicKey('2xNweLHLKifGNBhLp2giBonGDJ3dPAHpSTaMJmfcMon8'),
                    poll: new PublicKey('2xNweLHLKifGNBhLp2giBonGDJ3dPAHpSTaMJmfcMon8'),
                    signer,
                    systemProgram: new PublicKey('11111111111111111111111111111111'),
                },
                ['TestCandidate', '42'],
            );

            expect(ix).toBeInstanceOf(TransactionInstruction);
        });

        it('should throw descriptive error when argument conversion fails', async () => {
            const program = createProgram(votingIdl);
            const signer = new PublicKey('Htp9MGP8Tig923ZFY7Qf2zzbMUmYneFRAhSp7vSg4wxV');

            // pollId (u64) gets an invalid value
            await expect(
                program.buildInstruction(
                    'initializeCandidate',
                    {
                        candidate: signer,
                        poll: signer,
                        signer,
                        systemProgram: new PublicKey('11111111111111111111111111111111'),
                    },
                    ['Test', 'not-a-number'],
                ),
                // eslint-disable-next-line no-restricted-syntax -- regex needed to match partial error message
            ).rejects.toThrow(/Could not convert "pollId" argument/);
        });
    });

    describe('getInstructionDisplay', () => {
        const systemDisplayIdl = loadIdl('system-program-display-idl.json');
        const tokenDisplayIdl = loadIdl('token-program-display-idl.json');
        const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

        const source = gen.publicKey(1);
        const destination = gen.publicKey(2);
        const mint = gen.publicKey(3);
        const mintAuthority = gen.publicKey(4);

        it('should interpolate the intent sentence from display metadata', async () => {
            const program = createProgram(systemDisplayIdl);

            const display = await program.getInstructionDisplay('transferSol', { destination, source }, ['1500000000']);

            expect(display?.intent).toBe('Transfer SOL');
            expect(display?.interpolatedIntent).toBe(
                `Transfer 1.5 SOL from ${source.toBase58()} to ${destination.toBase58()}`,
            );
        });

        it('should label fields from display metadata', async () => {
            const program = createProgram(systemDisplayIdl);

            const display = await program.getInstructionDisplay('transferSol', { destination, source }, ['1500000000']);

            expect(display?.fields).toEqual([
                { label: 'Amount', value: '1.5 SOL' },
                { label: 'From', value: source.toBase58() },
                { label: 'To', value: destination.toBase58() },
            ]);
        });

        it('should fall back to a titleCased intent when the IDL carries no display metadata', async () => {
            const program = createProgram(systemIdl);

            const display = await program.getInstructionDisplay('transferSol', { destination, source }, ['1500000000']);

            expect(display?.intent).toBe('Transfer Sol');
            expect(display?.interpolatedIntent).toBeNull();
        });

        it('should resolve an injected account field when fetchAccount is supplied', async () => {
            const program = createProgram(tokenDisplayIdl, TOKEN_PROGRAM);
            const fetchAccount = vi.fn(async (queried: Address): Promise<MaybeEncodedAccount> => ({
                address: queried,
                data: encodeMint({ decimals: 6, mintAuthority: mintAuthority.toBase58() }),
                executable: false,
                exists: true,
                lamports: lamports(1_000_000n),
                programAddress: address(TOKEN_PROGRAM.toBase58()),
                space: 82n,
            }));

            const display = await program.getInstructionDisplay(
                'mintTo',
                { mint, mintAuthority, token: destination },
                ['1500000'],
                { fetchAccount },
            );

            expect(display?.interpolatedIntent).toBe(`Mint 1.5 ${mint.toBase58()} to ${destination.toBase58()}`);
            expect(fetchAccount).toHaveBeenCalledWith(mint.toBase58());
        });

        it('should mark the amount raw and withhold the sentence when fetchAccount is absent', async () => {
            const program = createProgram(tokenDisplayIdl, TOKEN_PROGRAM);

            const display = await program.getInstructionDisplay('mintTo', { mint, mintAuthority, token: destination }, [
                '1500000',
            ]);

            expect(display?.interpolatedIntent).toBeNull();
            expect(display?.fields).toContainEqual({ label: 'Amount', value: '1500000 (raw)' });
        });
    });
});
