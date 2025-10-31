import { Connection, PublicKey } from '@solana/web3.js';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { IdlExecutor } from './idl-executor';
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
            signTransaction: vi.fn(),
            signAllTransactions: vi.fn(),
        };
        executor = new IdlExecutor({ connection: mockConnection });
    });

    describe('interpreter detection', () => {
        it('should detect Anchor IDL correctly', () => {
            const anchorIdl = {
                version: '0.1.0',
                name: 'test-program',
                instructions: [],
                accounts: [],
            };

            const interpreter = executor.detectInterpreter(anchorIdl);
            expect(interpreter).toBeTruthy();
            expect(interpreter?.name).toBe('anchor');
        });

        it('should detect Codama IDL correctly', () => {
            const codamaIdl = {
                standard: 'codama',
                version: '1.0.0',
                name: 'test-program',
                nodes: [],
            };

            const interpreter = executor.detectInterpreter(codamaIdl);
            expect(interpreter).toBeTruthy();
            expect(interpreter?.name).toBe('codama');
        });

        it('should return null for unsupported IDL types', () => {
            const unsupportedIdl = {
                unknownField: 'value',
                someOtherField: 123,
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
    });

    describe('initializeProgram', () => {
        it('should throw error when no suitable interpreter is found', async () => {
            const unsupportedIdl = {
                unknownField: 'value',
                someOtherField: 123,
            };

            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            await expect(
                executor.initializeProgram(unsupportedIdl, programId, mockWallet)
            ).rejects.toThrow('No suitable interpreter found for the provided IDL');
        });

        it('should throw error for Codama IDLs with informative message', async () => {
            const codamaIdl = {
                standard: 'codama',
                version: '1.0.0',
                name: 'test-program',
            };

            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            await expect(
                executor.initializeProgram(codamaIdl, programId, mockWallet)
            ).rejects.toThrow('Codama IDL format is not yet supported for interactive features');
        });

        it('should throw error when specified interpreter is not found', async () => {
            const anchorIdl = {
                version: '0.1.0',
                name: 'test-program',
                instructions: [],
            };

            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            await expect(
                executor.initializeProgram(anchorIdl, programId, mockWallet, 'non-existent')
            ).rejects.toThrow('Interpreter "non-existent" not found');
        });

        it('should use specified interpreter when available', async () => {
            const mockInterpreter: IdlInterpreter = {
                name: 'custom',
                canHandle: vi.fn().mockReturnValue(true),
                createProgram: vi.fn().mockResolvedValue({} as UnifiedProgram),
                createInstruction: vi.fn(),
            };

            executor.registerInterpreter(mockInterpreter);

            const customIdl = { custom: true };
            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            await executor.initializeProgram(customIdl, programId, mockWallet, 'custom');

            expect(mockInterpreter.createProgram).toHaveBeenCalledWith(
                mockConnection,
                mockWallet,
                programId,
                customIdl
            );
        });
    });

    describe('interpreter registration', () => {
        it('should register a new interpreter', () => {
            const mockInterpreter: IdlInterpreter = {
                name: 'custom',
                canHandle: vi.fn().mockReturnValue(true),
                createProgram: vi.fn(),
                createInstruction: vi.fn(),
            };

            executor.registerInterpreter(mockInterpreter);

            const retrieved = executor.getInterpreter('custom');
            expect(retrieved).toBe(mockInterpreter);
        });

        it('should override existing interpreter with same name', () => {
            const firstInterpreter: IdlInterpreter = {
                name: 'custom',
                canHandle: vi.fn().mockReturnValue(false),
                createProgram: vi.fn(),
                createInstruction: vi.fn(),
            };

            const secondInterpreter: IdlInterpreter = {
                name: 'custom',
                canHandle: vi.fn().mockReturnValue(true),
                createProgram: vi.fn(),
                createInstruction: vi.fn(),
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

    describe('interpreter order', () => {
        it('should check Codama interpreter before Anchor', () => {
            // Create an IDL that could potentially match both
            const ambiguousIdl = {
                standard: 'codama',
                version: '0.1.0',
                name: 'test',
                instructions: [],
            };

            const interpreter = executor.detectInterpreter(ambiguousIdl);
            // Should detect as Codama because it's checked first
            expect(interpreter?.name).toBe('codama');
        });
    });

    describe('error messages', () => {
        it('should provide clear error message for unsupported IDL', async () => {
            const unsupportedIdl = {
                someField: 'value',
            };

            const programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

            try {
                await executor.initializeProgram(unsupportedIdl, programId, mockWallet);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('No suitable interpreter found for the provided IDL');
            }
        });
    });
});
