import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { describe, expect, it, vi } from 'vitest';

import { UnifiedWallet } from '../unified-program.d';
import { AnchorInterpreter } from './anchor-interpreter';

describe('AnchorInterpreter', () => {
    const interpreter = new AnchorInterpreter();

    const mockWallet: UnifiedWallet = {
        publicKey: PublicKey.default,
        signTransaction: vi.fn(),
        signAllTransactions: vi.fn(),
    };

    const mockConnection = new Connection('http://mainnet.rpc.address');
    const mockProgramId = SystemProgram.programId;

    describe('interpreter name', () => {
        it('should have the correct name', () => {
            expect(interpreter.name).toBe('anchor');
        });
    });

    describe('canHandle', () => {
        it.each([
            [
                {
                    version: '1.0.0',
                    name: 'test-program',
                    instructions: [],
                },
                true,
                'Anchor',
            ],
            [
                {
                    version: '0.0.0',
                    name: 'test-program',
                    instructions: [],
                    metadata: {
                        spec: 'legacy',
                    },
                },
                true,
                'Other format',
            ],
            [null, false, 'null'],
            [undefined, false, 'undefined'],
        ])('should identify whether can handle $2 IDL with Anchor', (anchorIdl: any, result, name: string) => {
            expect(interpreter.canHandle(anchorIdl)).toBe(result);
        });
    });
});
