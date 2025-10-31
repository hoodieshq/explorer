import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { describe, expect, it, vi } from 'vitest';

import { UnifiedWallet } from '../unified-program.d';
import { CodamaInterpreter } from './codama-interpreter';

describe('CodamaInterpreter', () => {
    const interpreter = new CodamaInterpreter();

    const mockWallet: UnifiedWallet = {
        publicKey: PublicKey.default,
        signTransaction: vi.fn(),
        signAllTransactions: vi.fn(),
    };

    const mockConnection = new Connection('http://mainnet.rpc.address');
    const mockProgramId = SystemProgram.programId;

    describe('interpreter name', () => {
        it('should have the correct name', () => {
            expect(interpreter.name).toBe('codama');
        });
    });

    describe('canHandle', () => {
        it.each([
            [
                {
                    standard: 'codama',
                    version: '1.0.0',
                    name: 'test-program',
                    nodes: [],
                },
                true,
                'Codama',
            ],
            [
                {
                    version: '0.1.0',
                    name: 'test-program',
                    instructions: [],
                    accounts: [],
                },
                false,
                'Anchor',
            ],
            [
                {
                    name: 'test-program',
                    instructions: [],
                    metadata: {
                        spec: 'legacy',
                    },
                },
                false,
                'Other',
            ],
            [
                {
                    name: 'test-program',
                    version: '1.0.0',
                },
                false,
                'standardless',
            ],
            [
                {
                    standard: 'anchor',
                    name: 'test-program',
                    version: '1.0.0',
                },
                false,
                'different standard',
            ],
            [null, false, 'null'],
            [undefined, false, 'undefined'],
        ])('should identify whether can handle $2 IDL with Codama', (codamaIdl: any, result, name: string) => {
            expect(interpreter.canHandle(codamaIdl)).toBe(result);
        });
    });

    describe('createProgram', () => {
        it('should throw an error when attempting to create a program', async () => {
            const codamaIdl = {
                standard: 'codama',
                version: '1.0.0',
                name: 'test-program',
            };

            await expect(
                interpreter.createProgram(mockConnection, mockWallet, mockProgramId, codamaIdl)
            ).rejects.toThrow('Codama IDL format is not yet supported for interactive features');
        });
    });

    describe('createInstruction', () => {
        it('should throw an error when attempting to create an instruction', async () => {
            const mockProgram = {} as any;
            const mockAccounts = {};
            const mockArgs: any[] = [];

            await expect(
                interpreter.createInstruction(mockProgram, 'testInstruction', mockAccounts, mockArgs)
            ).rejects.toThrow('Codama IDL format is not yet supported for interactive features');
        });
    });
});
