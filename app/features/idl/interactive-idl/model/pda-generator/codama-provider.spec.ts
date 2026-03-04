import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { SupportedIdl } from '@entities/idl';
import { PublicKey } from '@solana/web3.js';
import type { RootNode } from 'codama';
import { describe, expect, it } from 'vitest';

import { createCodamaPdaProvider } from './codama-provider';

function loadCodamaIdl(filename: string): RootNode {
    const idlPath = path.resolve(__dirname, '../__mocks__/codama', filename);
    return JSON.parse(readFileSync(idlPath, 'utf8')) as RootNode;
}

describe('createCodamaPdaProvider', () => {
    const votingIdl = loadCodamaIdl('codama-voting.json');

    describe('canHandle', () => {
        it('should return true for Codama IDL', () => {
            const provider = createCodamaPdaProvider();
            expect(provider.canHandle(votingIdl as unknown as SupportedIdl)).toBe(true);
        });

        it('should return false for non-Codama IDL', () => {
            const provider = createCodamaPdaProvider();
            const anchorIdl = { address: 'abc', instructions: [], metadata: { spec: '0.1.0' } };
            expect(provider.canHandle(anchorIdl as unknown as SupportedIdl)).toBe(false);
        });
    });

    describe('getProgramId', () => {
        it('should return PublicKey from Codama IDL', () => {
            const provider = createCodamaPdaProvider();
            const result = provider.getProgramId(votingIdl as unknown as SupportedIdl);
            expect(result).toBeInstanceOf(PublicKey);
            expect(result?.toBase58()).toBe('AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye');
        });

        it('should return null for invalid public key', () => {
            const provider = createCodamaPdaProvider();
            const badIdl = { ...votingIdl, program: { ...votingIdl.program, publicKey: 'not-a-key' } };
            expect(provider.getProgramId(badIdl as unknown as SupportedIdl)).toBeNull();
        });
    });

    describe('computePdas', () => {
        it('should return empty object for unknown instruction', async () => {
            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(votingIdl as unknown as SupportedIdl, 'nonExistent', {}, {});
            expect(result).toEqual({});
        });

        it('should derive PDAs with argument seeds', async () => {
            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'initializeCandidate',
                { candidateName: 'Alice', pollId: '123' },
                {}
            );

            expect(result.poll).toBeDefined();
            expect(result.poll.generated).not.toBeNull();
            expect(typeof result.poll.generated).toBe('string');
            expect(result.poll.seeds).toHaveLength(1);
            expect(result.poll.seeds[0]).toEqual({ name: 'pollId', value: '123' });

            expect(result.candidate).toBeDefined();
            expect(result.candidate.generated).not.toBeNull();
            expect(result.candidate.seeds).toHaveLength(2);
            expect(result.candidate.seeds[0]).toEqual({ name: 'pollId', value: '123' });
            expect(result.candidate.seeds[1]).toEqual({ name: 'candidateName', value: 'Alice' });
        });

        it('should return null for generated when required argument seed is missing', async () => {
            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'initializeCandidate',
                { candidateName: 'Alice' },
                {}
            );

            expect(result.poll.generated).toBeNull();
            expect(result.poll.seeds[0]).toEqual({ name: 'pollId', value: null });

            expect(result.candidate.generated).toBeNull();
            expect(result.candidate.seeds[0]).toEqual({ name: 'pollId', value: null });
            expect(result.candidate.seeds[1]).toEqual({ name: 'candidateName', value: 'Alice' });
        });

        it('should return null for generated when argument seed value is empty', async () => {
            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'initializeCandidate',
                { candidateName: 'Alice', pollId: '' },
                {}
            );

            expect(result.poll.generated).toBeNull();
            expect(result.poll.seeds[0]).toEqual({ name: 'pollId', value: null });
        });

        it('should derive PDA with account seeds', async () => {
            const provider = createCodamaPdaProvider();
            const authorityKey = PublicKey.default.toBase58();
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'instructionWithAccountSeed',
                {},
                { authority: authorityKey }
            );

            expect(result.pdaAccount).toBeDefined();
            expect(result.pdaAccount.generated).not.toBeNull();
            expect(result.pdaAccount.seeds).toHaveLength(1);
            expect(result.pdaAccount.seeds[0]).toEqual({ name: 'authority', value: authorityKey });
        });

        it('should return null when account seed value is missing', async () => {
            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'instructionWithAccountSeed',
                {},
                {}
            );

            expect(result.pdaAccount.generated).toBeNull();
            expect(result.pdaAccount.seeds[0]).toEqual({ name: 'authority', value: null });
        });

        it('should return null when account seed is whitespace-only', async () => {
            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'instructionWithAccountSeed',
                {},
                { authority: '   ' }
            );

            expect(result.pdaAccount.generated).toBeNull();
            expect(result.pdaAccount.seeds[0]).toEqual({ name: 'authority', value: null });
        });

        it('should handle constant string seeds', async () => {
            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'instructionWithConstSeed',
                {},
                {}
            );

            expect(result.pdaAccount).toBeDefined();
            expect(result.pdaAccount.generated).not.toBeNull();
            expect(result.pdaAccount.seeds).toHaveLength(1);
            // "test" encoded as hex
            expect(result.pdaAccount.seeds[0]).toEqual({ name: '0x74657374', value: '0x74657374' });
        });

        it('should skip accounts without PDA default value', async () => {
            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'initializeCandidate',
                { candidateName: 'Bob', pollId: '1' },
                {}
            );

            // signer and systemProgram have no pdaValueNode
            expect(result.signer).toBeUndefined();
            expect(result.systemProgram).toBeUndefined();
            // Only PDA accounts
            expect(result.poll).toBeDefined();
            expect(result.candidate).toBeDefined();
        });

        it('should generate consistent addresses for same inputs', async () => {
            const provider = createCodamaPdaProvider();
            const args = { candidateName: 'Consistent', pollId: '42' };

            const result1 = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'initializeCandidate',
                args,
                {}
            );
            const result2 = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'initializeCandidate',
                args,
                {}
            );

            expect(result1.poll.generated).toBe(result2.poll.generated);
            expect(result1.candidate.generated).toBe(result2.candidate.generated);
        });

        it('should return null for generated when seed value fails conversion', async () => {
            const provider = createCodamaPdaProvider();
            // pollId expects u64 but we pass an invalid value
            const result = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'initializeCandidate',
                { candidateName: 'Alice', pollId: 'not-a-number' },
                {}
            );

            expect(result.poll.generated).toBeNull();
            expect(result.poll.seeds[0]).toEqual({ name: 'pollId', value: 'not-a-number' });
        });

        it('should handle pdaLinkNode by resolving from program pdas map', async () => {
            // Create an IDL with a pdaLinkNode reference instead of inline pdaNode
            const idlWithPdaLink = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            // Move the inline PDA to the program.pdas array and replace with a link
            const initCandidateIx = idlWithPdaLink.program.instructions.find(i => i.name === 'initializePoll')!;
            const pollAccount = initCandidateIx.accounts.find(a => a.name === 'poll')!;
            const pdaValue = (pollAccount as any).defaultValue;
            const inlinePda = pdaValue.pda;

            // Add PDA to program.pdas
            (idlWithPdaLink.program.pdas as any[]).push(inlinePda);

            // Replace inline pdaNode with pdaLinkNode
            pdaValue.pda = { kind: 'pdaLinkNode', name: 'poll' };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithPdaLink as unknown as SupportedIdl,
                'initializePoll',
                { pollId: '99' },
                {}
            );

            expect(result.poll).toBeDefined();
            expect(result.poll.generated).not.toBeNull();
            expect(result.poll.seeds[0]).toEqual({ name: 'pollId', value: '99' });
        });

        it('should handle conditionalValueNode with pdaValueNode in ifTrue', async () => {
            const idlWithConditional = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            const initPollIx = idlWithConditional.program.instructions.find(i => i.name === 'initializePoll')!;
            const pollAccount = initPollIx.accounts.find(a => a.name === 'poll')!;
            const originalDefault = (pollAccount as any).defaultValue;

            // Wrap the pdaValueNode in a conditionalValueNode
            (pollAccount as any).defaultValue = {
                condition: { kind: 'argumentValueNode', name: 'pollId' },
                ifTrue: originalDefault,
                kind: 'conditionalValueNode',
            };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithConditional as unknown as SupportedIdl,
                'initializePoll',
                { pollId: '7' },
                {}
            );

            expect(result.poll).toBeDefined();
            expect(result.poll.generated).not.toBeNull();
        });

        it('should handle conditionalValueNode with pdaValueNode in ifFalse', async () => {
            const idlWithConditional = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            const initPollIx = idlWithConditional.program.instructions.find(i => i.name === 'initializePoll')!;
            const pollAccount = initPollIx.accounts.find(a => a.name === 'poll')!;
            const originalDefault = (pollAccount as any).defaultValue;

            (pollAccount as any).defaultValue = {
                condition: { kind: 'argumentValueNode', name: 'pollId' },
                ifFalse: originalDefault,
                kind: 'conditionalValueNode',
            };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithConditional as unknown as SupportedIdl,
                'initializePoll',
                { pollId: '7' },
                {}
            );

            expect(result.poll).toBeDefined();
            expect(result.poll.generated).not.toBeNull();
        });

        it('should use cached client for same program key and version', async () => {
            const provider = createCodamaPdaProvider();

            // First call creates a client
            const result1 = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'initializeCandidate',
                { candidateName: 'A', pollId: '1' },
                {}
            );

            // Second call should reuse cached client and produce same results
            const result2 = await provider.computePdas(
                votingIdl as unknown as SupportedIdl,
                'vote',
                { candidateName: 'A', pollId: '1' },
                {}
            );

            // Both should work (proving the client was usable both times)
            expect(result1.poll.generated).not.toBeNull();
            expect(result2.poll.generated).not.toBeNull();
            // Same seeds should produce same PDA
            expect(result1.poll.generated).toBe(result2.poll.generated);
        });

        it('should handle constant seed with bytesValueNode (base16)', async () => {
            const idlWithBytesSeed = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            const constSeedIx = idlWithBytesSeed.program.instructions.find(i => i.name === 'instructionWithConstSeed')!;
            const pdaAccount = constSeedIx.accounts.find(a => a.name === 'pdaAccount')!;
            const pdaNode = (pdaAccount as any).defaultValue.pda;

            // Replace the string seed with a bytes seed
            pdaNode.seeds[0] = {
                kind: 'constantPdaSeedNode',
                type: { kind: 'bytesTypeNode' },
                value: { data: 'deadbeef', encoding: 'base16', kind: 'bytesValueNode' },
            };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithBytesSeed as unknown as SupportedIdl,
                'instructionWithConstSeed',
                {},
                {}
            );

            expect(result.pdaAccount).toBeDefined();
            expect(result.pdaAccount.seeds[0]).toEqual({ name: '0xdeadbeef', value: '0xdeadbeef' });
        });

        it('should handle constant seed with bytesValueNode (base58)', async () => {
            const idlWithBytesSeed = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            const constSeedIx = idlWithBytesSeed.program.instructions.find(i => i.name === 'instructionWithConstSeed')!;
            const pdaAccount = constSeedIx.accounts.find(a => a.name === 'pdaAccount')!;
            const pdaNode = (pdaAccount as any).defaultValue.pda;

            // base58 for bytes [1, 2, 3] is "Ldp"
            pdaNode.seeds[0] = {
                kind: 'constantPdaSeedNode',
                type: { kind: 'bytesTypeNode' },
                value: { data: 'Ldp', encoding: 'base58', kind: 'bytesValueNode' },
            };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithBytesSeed as unknown as SupportedIdl,
                'instructionWithConstSeed',
                {},
                {}
            );

            expect(result.pdaAccount).toBeDefined();
            // eslint-disable-next-line no-restricted-syntax -- regex needed to match hex prefix pattern
            expect(result.pdaAccount.seeds[0].name).toMatch(/^0x/);
        });

        it('should handle constant seed with bytesValueNode (base64)', async () => {
            const idlWithBytesSeed = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            const constSeedIx = idlWithBytesSeed.program.instructions.find(i => i.name === 'instructionWithConstSeed')!;
            const pdaAccount = constSeedIx.accounts.find(a => a.name === 'pdaAccount')!;
            const pdaNode = (pdaAccount as any).defaultValue.pda;

            // base64 for "hello" is "aGVsbG8="
            pdaNode.seeds[0] = {
                kind: 'constantPdaSeedNode',
                type: { kind: 'bytesTypeNode' },
                value: { data: 'aGVsbG8=', encoding: 'base64', kind: 'bytesValueNode' },
            };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithBytesSeed as unknown as SupportedIdl,
                'instructionWithConstSeed',
                {},
                {}
            );

            expect(result.pdaAccount).toBeDefined();
            // "hello" in hex is "68656c6c6f"
            expect(result.pdaAccount.seeds[0]).toEqual({ name: '0x68656c6c6f', value: '0x68656c6c6f' });
        });

        it('should handle constant seed with bytesValueNode (utf8)', async () => {
            const idlWithBytesSeed = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            const constSeedIx = idlWithBytesSeed.program.instructions.find(i => i.name === 'instructionWithConstSeed')!;
            const pdaAccount = constSeedIx.accounts.find(a => a.name === 'pdaAccount')!;
            const pdaNode = (pdaAccount as any).defaultValue.pda;

            pdaNode.seeds[0] = {
                kind: 'constantPdaSeedNode',
                type: { kind: 'bytesTypeNode' },
                value: { data: 'abc', encoding: 'utf8', kind: 'bytesValueNode' },
            };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithBytesSeed as unknown as SupportedIdl,
                'instructionWithConstSeed',
                {},
                {}
            );

            expect(result.pdaAccount).toBeDefined();
            // "abc" in hex is "616263"
            expect(result.pdaAccount.seeds[0]).toEqual({ name: '0x616263', value: '0x616263' });
        });

        it('should handle constant seed with publicKeyValueNode', async () => {
            const idlWithPubkeySeed = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            const constSeedIx = idlWithPubkeySeed.program.instructions.find(
                i => i.name === 'instructionWithConstSeed'
            )!;
            const pdaAccount = constSeedIx.accounts.find(a => a.name === 'pdaAccount')!;
            const pdaNode = (pdaAccount as any).defaultValue.pda;

            const pubkey = PublicKey.default.toBase58();
            pdaNode.seeds[0] = {
                kind: 'constantPdaSeedNode',
                type: { kind: 'publicKeyTypeNode' },
                value: { kind: 'publicKeyValueNode', publicKey: pubkey },
            };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithPubkeySeed as unknown as SupportedIdl,
                'instructionWithConstSeed',
                {},
                {}
            );

            expect(result.pdaAccount).toBeDefined();
            // 32 zero bytes in hex = 64 hex chars
            expect(result.pdaAccount.seeds[0].name).toBe('0x' + '0'.repeat(64));
        });

        it('should handle constant seed with programIdValueNode', async () => {
            const idlWithProgIdSeed = JSON.parse(JSON.stringify(votingIdl)) as RootNode;
            const constSeedIx = idlWithProgIdSeed.program.instructions.find(
                i => i.name === 'instructionWithConstSeed'
            )!;
            const pdaAccount = constSeedIx.accounts.find(a => a.name === 'pdaAccount')!;
            const pdaNode = (pdaAccount as any).defaultValue.pda;

            pdaNode.seeds[0] = {
                kind: 'constantPdaSeedNode',
                type: { kind: 'publicKeyTypeNode' },
                value: { kind: 'programIdValueNode' },
            };

            const provider = createCodamaPdaProvider();
            const result = await provider.computePdas(
                idlWithProgIdSeed as unknown as SupportedIdl,
                'instructionWithConstSeed',
                {},
                {}
            );

            expect(result.pdaAccount).toBeDefined();
            // Program ID bytes as hex
            const expectedHex = Array.from(new PublicKey(votingIdl.program.publicKey).toBytes())
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            expect(result.pdaAccount.seeds[0]).toEqual({
                name: `0x${expectedHex}`,
                value: `0x${expectedHex}`,
            });
        });
    });
});
