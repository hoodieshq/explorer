import { ComputeBudgetProgram, PublicKey, type VersionedBlockResponse } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';

import { alloc, writeUint32LE } from '@/app/shared/lib/bytes';

import { estimateRequestedComputeUnits } from '../compute-units-schedule';

describe('estimateRequestedComputeUnits', () => {
    const createMockTransaction = (
        instructions: Array<{
            programId: string;
            data: Uint8Array;
        }>,
    ): Parameters<typeof estimateRequestedComputeUnits>[0] => {
        const staticAccountKeys = [...new Set(instructions.map(ix => ix.programId))].map(id => new PublicKey(id));

        return {
            transaction: {
                message: {
                    compiledInstructions: instructions.map(ix => ({
                        data: ix.data,
                        programIdIndex: staticAccountKeys.findIndex(key => key.toBase58() === ix.programId),
                    })),
                    staticAccountKeys,
                },
            },
        } as VersionedBlockResponse['transactions'][number];
    };

    describe('with explicit compute budget', () => {
        it('should return compute units from SetComputeUnitLimit instruction', () => {
            const computeUnits = 300_000;
            const data = alloc(5);
            data[0] = 2;
            writeUint32LE(data, computeUnits, 1);

            const tx = createMockTransaction([
                {
                    data,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(computeUnits);
        });

        it('should return compute units from deprecated RequestUnits instruction', () => {
            const computeUnits = 150_000;
            const data = alloc(9);
            data[0] = 0;
            writeUint32LE(data, computeUnits, 1);
            writeUint32LE(data, 0, 5);

            const tx = createMockTransaction([
                {
                    data,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(computeUnits);
        });

        it('should prioritize first compute budget instruction found', () => {
            const data1 = alloc(5);
            data1[0] = 2;
            writeUint32LE(data1, 100_000, 1);

            const data2 = alloc(5);
            data2[0] = 2;
            writeUint32LE(data2, 200_000, 1);

            const tx = createMockTransaction([
                {
                    data: data1,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
                {
                    data: data2,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(100_000);
        });
    });

    describe('without explicit compute budget', () => {
        it('should return default for non-builtin programs', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(200_000);
        });

        it('should return minimal units for builtin programs after activation', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: '11111111111111111111111111111111',
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 759n, Cluster.MainnetBeta)).toEqual(3_000);

            expect(estimateRequestedComputeUnits(tx, 758n, Cluster.MainnetBeta)).toEqual(200_000);
        });

        it('should return sum of reserved units for mixed instructions', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: '11111111111111111111111111111111',
                },
                {
                    data: new Uint8Array([4, 5, 6]),
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 759n, Cluster.MainnetBeta)).toEqual(203_000);
        });

        it('should handle feature gate program correctly across epochs', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: 'Feature111111111111111111111111111111111111',
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 752n, Cluster.MainnetBeta)).toEqual(200_000);

            expect(estimateRequestedComputeUnits(tx, 759n, Cluster.MainnetBeta)).toEqual(200_000);
        });
    });

    describe('edge cases', () => {
        it('should handle empty instruction data', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([]),
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(3_000);
        });

        it('should handle invalid compute budget instruction data', () => {
            const tx = createMockTransaction([
                {
                    data: new Uint8Array([2, 1, 2]),
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(3_000);
        });

        it('should handle transactions with no instructions', () => {
            const tx = createMockTransaction([]);
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(0);
        });

        it('should respect the 1.4M compute unit cap', () => {
            const instructions = [];
            for (let i = 0; i < 10; i++) {
                instructions.push({
                    data: new Uint8Array([1, 2, 3]),
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                });
            }
            const tx = createMockTransaction(instructions);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(1_400_000);
        });

        it('should handle compute budget with other instructions', () => {
            const data = alloc(5);
            data[0] = 2;
            writeUint32LE(data, 500_000, 1);

            const tx = createMockTransaction([
                {
                    data,
                    programId: ComputeBudgetProgram.programId.toBase58(),
                },
                {
                    data: new Uint8Array([1, 2, 3]),
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
            ]);

            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(500_000);
        });
    });

    describe('v1 transactions', () => {
        const createV1Transaction = (transactionConfig?: {
            computeUnitLimit?: number;
        }): Parameters<typeof estimateRequestedComputeUnits>[0] => {
            const data = alloc(5);
            data[0] = 2;
            writeUint32LE(data, 999_999, 1);

            return {
                ...createMockTransaction([{ data, programId: ComputeBudgetProgram.programId.toBase58() }]),
                transactionConfig,
                version: 1,
            };
        };

        it('should read the limit from the message config rather than the instructions', () => {
            const tx = createV1Transaction({ computeUnitLimit: 10_000 });
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(10_000);
        });

        it('should report zero when the config sets no compute unit limit', () => {
            const tx = createV1Transaction({});
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(0);
        });

        it('should report zero when the message carries no config at all', () => {
            const tx = createV1Transaction(undefined);
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(0);
        });

        it('should respect the 1.4M compute unit cap', () => {
            const tx = createV1Transaction({ computeUnitLimit: 5_000_000 });
            expect(estimateRequestedComputeUnits(tx, 1000n, Cluster.MainnetBeta)).toEqual(1_400_000);
        });
    });
});
