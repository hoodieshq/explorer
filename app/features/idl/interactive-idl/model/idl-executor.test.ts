import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdlExecutor, populateAccounts, populateArguments } from './idl-executor';
import { IdlInterpreter } from './idl-interpreter.d';
import { UnifiedProgram, UnifiedWallet } from './unified-program.d';

describe('IdlExecutor', () => {
    let executor: IdlExecutor;
    let mockConnection: Connection;
    let mockWallet: UnifiedWallet;

    beforeEach(() => {
        mockConnection = new Connection('http://localhost:8899');
        mockWallet = {
            publicKey: new PublicKey('11111111111111111111111111111111'),
            signAllTransactions: vi.fn(),
            signTransaction: vi.fn(),
        };
        executor = new IdlExecutor({ connection: mockConnection });
    });

    describe('detectInterpreter', () => {
        it('should detect Anchor IDL correctly', () => {
            const anchorIdl = {
                accounts: [],
                instructions: [],
                name: 'test-program',
                version: '0.1.0',
            };

            const interpreter = executor.detectInterpreter(anchorIdl);
            expect(interpreter).toBeTruthy();
            expect(interpreter?.name).toBe('anchor');
        });

        it('should detect Codama IDL correctly', () => {
            const codamaIdl = {
                name: 'test-program',
                nodes: [],
                standard: 'codama',
                version: '1.0.0',
            };

            const interpreter = executor.detectInterpreter(codamaIdl);
            expect(interpreter).toBeTruthy();
            expect(interpreter?.name).toBe('codama');
        });

        it('should return null for unsupported IDL types', () => {
            const unsupportedIdl = {
                someOtherField: 123,
                unknownField: 'value',
            };

            const interpreter = executor.detectInterpreter(unsupportedIdl);
            expect(interpreter).toBeNull();
        });

        it('should return null for invalid inputs', () => {
            expect(executor.detectInterpreter(null)).toBeNull();
            expect(executor.detectInterpreter(undefined)).toBeNull();
            expect(executor.detectInterpreter('string')).toBeNull();
            expect(executor.detectInterpreter(123)).toBeNull();
            expect(executor.detectInterpreter(true)).toBeNull();
        });

        it('should check Codama interpreter before Anchor', () => {
            // Create an IDL that could potentially match both
            const ambiguousIdl = {
                instructions: [],
                name: 'test',
                standard: 'codama',
                version: '0.1.0',
            };

            const interpreter = executor.detectInterpreter(ambiguousIdl);
            // Should detect as Codama because it's checked first
            expect(interpreter?.name).toBe('codama');
        });
    });

    describe('initializeProgram', () => {
        it('should throw error when no suitable interpreter is found', async () => {
            const unsupportedIdl = {
                someOtherField: 123,
                unknownField: 'value',
            };

            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            await expect(executor.initializeProgram(unsupportedIdl as any, programId, mockWallet)).rejects.toThrow(
                'No suitable interpreter found for the provided IDL'
            );
        });

        it('should throw error for Codama IDLs with informative message', async () => {
            const codamaIdl = {
                name: 'test-program',
                standard: 'codama',
                version: '1.0.0',
            };

            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            await expect(executor.initializeProgram(codamaIdl as any, programId, mockWallet)).rejects.toThrow(
                'Codama IDL format is not yet supported for interactive features'
            );
        });

        it('should throw error when specified interpreter is not found', async () => {
            const anchorIdl = {
                instructions: [],
                name: 'test-program',
                version: '0.1.0',
            };

            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            await expect(executor.initializeProgram(anchorIdl, programId, mockWallet, 'non-existent')).rejects.toThrow(
                'Interpreter "non-existent" not found'
            );
        });

        it('should use specified interpreter when available', async () => {
            const mockInterpreter: IdlInterpreter = {
                canHandle: vi.fn().mockReturnValue(true),
                createInstruction: vi.fn(),
                createProgram: vi.fn().mockResolvedValue({} as UnifiedProgram),
                name: 'custom',
            };

            executor.registerInterpreter(mockInterpreter);

            const customIdl = { custom: true };
            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            await executor.initializeProgram(customIdl as any, programId, mockWallet, 'custom');

            expect(mockInterpreter.createProgram).toHaveBeenCalledWith(
                mockConnection,
                mockWallet,
                programId,
                customIdl
            );
        });

        it('should provide clear error message for unsupported IDL', async () => {
            const unsupportedIdl = {
                someField: 'value',
            };

            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            try {
                await executor.initializeProgram(unsupportedIdl as any, programId, mockWallet);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('No suitable interpreter found for the provided IDL');
            }
        });
    });

    describe('registerInterpreter', () => {
        it('should register a new interpreter', () => {
            const mockInterpreter: IdlInterpreter = {
                canHandle: vi.fn().mockReturnValue(true),
                createInstruction: vi.fn(),
                createProgram: vi.fn(),
                name: 'custom',
            };

            executor.registerInterpreter(mockInterpreter);

            const retrieved = executor.getInterpreter('custom');
            expect(retrieved).toBe(mockInterpreter);
        });

        it('should override existing interpreter with same name', () => {
            const firstInterpreter: IdlInterpreter = {
                canHandle: vi.fn().mockReturnValue(false),
                createInstruction: vi.fn(),
                createProgram: vi.fn(),
                name: 'custom',
            };

            const secondInterpreter: IdlInterpreter = {
                canHandle: vi.fn().mockReturnValue(true),
                createInstruction: vi.fn(),
                createProgram: vi.fn(),
                name: 'custom',
            };

            executor.registerInterpreter(firstInterpreter);
            executor.registerInterpreter(secondInterpreter);

            const retrieved = executor.getInterpreter('custom');
            expect(retrieved).toBe(secondInterpreter);
        });
    });

    describe('getInterpreter', () => {
        it('should return undefined for non-existent interpreter', () => {
            const interpreter = executor.getInterpreter('non-existent');
            expect(interpreter).toBeUndefined();
        });

        it('should return registered interpreter by name', () => {
            const interpreter = executor.getInterpreter('anchor');
            expect(interpreter).toBeTruthy();
            expect(interpreter?.name).toBe('anchor');
        });
    });

    describe('setConnection', () => {
        it('should update the connection', () => {
            const newConnection = new Connection('http://localhost:9999');
            executor.setConnection(newConnection);

            // The connection is private, so we can't directly test it
            // But we can verify it doesn't throw
            expect(() => executor.setConnection(newConnection)).not.toThrow();
        });
    });

    describe('getInstruction', async () => {
        it('should parse accounts and arguments correctly and pass them to createInstruction', async () => {
            const mockIdl = {
                accounts: [],
                errors: [],
                events: [],
                instructions: [],
                name: 'test',
                types: [],
                version: '0.1.0',
            };
            const mockProgram = { id: new PublicKey('11111111111111111111111111111111') };
            const instructionName = 'removeMemberAndChangeThreshold';

            // Generate dynamic addresses
            const multisigKeypair = Keypair.generate();
            const oldMemberKeypair = Keypair.generate();

            // Raw data with instruction name prefix
            const rawAccounts = {
                'removeMemberAndChangeThreshold.multisig': multisigKeypair.publicKey.toBase58(),
            };

            /* eslint-disable sort-keys-fix/sort-keys-fix */
            const rawArguments = {
                'removeMemberAndChangeThreshold.oldMember': oldMemberKeypair.publicKey.toBase58(),
                'removeMemberAndChangeThreshold.newThreshold': '1',
            };
            /* eslint-enable sort-keys-fix/sort-keys-fix */

            // Process through populateAccounts and populateArguments
            const accounts = populateAccounts(rawAccounts, instructionName);
            const args = populateArguments(rawArguments, instructionName);

            // Mock the createInstruction method
            const anchorInterpreter = executor.getInterpreter('anchor');
            const createInstructionSpy = vi
                .spyOn(anchorInterpreter!, 'createInstruction')
                .mockImplementation(async () => ({} as any));

            // Act
            await executor.getInstruction(mockProgram as any, instructionName, accounts, args, mockIdl, 'anchor');

            // Assert - verify createInstruction was called with properly parsed arguments
            expect(createInstructionSpy).toHaveBeenCalledOnce();
            expect(createInstructionSpy).toHaveBeenCalledWith(
                mockProgram,
                instructionName,
                {
                    multisig: multisigKeypair.publicKey,
                },
                [oldMemberKeypair.publicKey.toBase58(), '1']
            );

            createInstructionSpy.mockRestore();
        });
    });
});
