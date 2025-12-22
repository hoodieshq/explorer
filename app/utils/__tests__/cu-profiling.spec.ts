import { PublicKey } from '@solana/web3.js';

import { Cluster } from '../cluster';
import { formatInstructionLogs } from '../cu-profiling';
import { InstructionLogs } from '../program-logs';

const DEFAULT_RESERVED_CU = 200_000;

// create mock instruction with programId
function mockInstruction(programId: string) {
    return {
        programId: new PublicKey(programId),
    };
}

// mock instruction logs
function mockInstructionLog(computeUnits: number, invokedProgram = 'TestProgram'): InstructionLogs {
    return {
        computeUnits,
        failed: false,
        invokedProgram,
        logs: [],
        truncated: false,
    };
}

describe('formatInstructionLogs', () => {
    describe('positive cases: basic functionality', () => {
        it('should format single instruction with CU consumption', () => {
            const testProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
            const instructions = [mockInstruction(testProgramId)];
            const instructionLogs = [mockInstructionLog(5000)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toEqual([
                {
                    computeUnits: 5000,
                    instructionTitle: 'Token Program',
                    minValue: 150,
                    programId: testProgramId,
                },
            ]);
        });

        it('should format multiple instructions with varying CU', () => {
            const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
            const systemProgramId = '11111111111111111111111111111111';
            const memoProgramId = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
            const instructions = [
                mockInstruction(tokenProgramId),
                mockInstruction(systemProgramId),
                mockInstruction(memoProgramId),
            ];
            const instructionLogs = [mockInstructionLog(5000), mockInstructionLog(150), mockInstructionLog(1000)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                computeUnits: 5000,
                instructionTitle: 'Token Program',
                minValue: 150,
                programId: tokenProgramId,
            });
            expect(result[1]).toEqual({
                computeUnits: 150,
                instructionTitle: 'System Program',
                minValue: 150,
                programId: systemProgramId,
            });
            expect(result[2]).toEqual({
                computeUnits: 1000,
                instructionTitle: 'Memo Program: Memo',
                minValue: 150,
                programId: memoProgramId,
            });
        });

        it('should add displayUnits for instructions with 0 CU', () => {
            const memo1ProgramId = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';
            const instructions = [mockInstruction(memo1ProgramId)];
            const instructionLogs = [mockInstructionLog(0)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toEqual([
                {
                    computeUnits: 0,
                    displayUnits: DEFAULT_RESERVED_CU,
                    instructionTitle: 'Memo Program v1',
                    minValue: 150,
                    programId: memo1ProgramId,
                    reservedValue: 0,
                },
            ]);
        });

        it('should not add displayUnits for instructions with non-zero CU', () => {
            const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
            const instructions = [mockInstruction(tokenProgramId)];
            const instructionLogs = [mockInstructionLog(5000)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result[0]).not.toHaveProperty('displayUnits');
        });

        it('should calculate reservedValue for known built-in programs with 0 CU', () => {
            const instructions = [
                mockInstruction('11111111111111111111111111111111'), // System Program
                mockInstruction('AddressLookupTab1e1111111111111111111111111'), // Address Lookup Table
                mockInstruction('Stake11111111111111111111111111111111111111'), // Stake Program
                mockInstruction('Vote111111111111111111111111111111111111111'), // Vote Program
                mockInstruction('ComputeBudget111111111111111111111111111111'), // Compute Budget
            ];
            const instructionLogs = [
                mockInstructionLog(0),
                mockInstructionLog(0),
                mockInstructionLog(0),
                mockInstructionLog(0),
                mockInstructionLog(0),
            ];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toHaveLength(5);
            // System Program
            expect(result[0]).toMatchObject({
                computeUnits: 0,
                minValue: 150,
                programId: '11111111111111111111111111111111',
                reservedValue: 150,
            });
            // Address Lookup Table
            expect(result[1]).toMatchObject({
                computeUnits: 0,
                minValue: 150,
                programId: 'AddressLookupTab1e1111111111111111111111111',
                reservedValue: 750,
            });
            // Stake Program
            expect(result[2]).toMatchObject({
                computeUnits: 0,
                minValue: 150,
                programId: 'Stake11111111111111111111111111111111111111',
                reservedValue: 750,
            });
            // Vote Program
            expect(result[3]).toMatchObject({
                computeUnits: 0,
                minValue: 150,
                programId: 'Vote111111111111111111111111111111111111111',
                reservedValue: 2100,
            });
            // Compute Budget
            expect(result[4]).toMatchObject({
                computeUnits: 0,
                minValue: 150,
                programId: 'ComputeBudget111111111111111111111111111111',
                reservedValue: 150,
            });
        });

        it('should not add reservedValue for instructions with non-zero CU', () => {
            const instructions = [mockInstruction('11111111111111111111111111111111')]; // System Program
            const instructionLogs = [mockInstructionLog(5000)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result[0]).toEqual({
                computeUnits: 5000,
                instructionTitle: 'System Program',
                minValue: 150,
                programId: '11111111111111111111111111111111',
            });
            expect(result[0]).not.toHaveProperty('reservedValue');
            expect(result[0]).not.toHaveProperty('displayUnits');
        });
    });

    describe('negative cases: empty/missing data', () => {
        it('should handle empty instructions array', () => {
            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [],
                instructions: [],
            });

            expect(result).toEqual([]);
        });

        it('should handle empty instructionLogs array', () => {
            const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
            const systemProgramId = '11111111111111111111111111111111';
            const instructions = [mockInstruction(tokenProgramId), mockInstruction(systemProgramId)];
            const instructionLogs: InstructionLogs[] = [];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toEqual([
                {
                    computeUnits: 0,
                    displayUnits: DEFAULT_RESERVED_CU,
                    instructionTitle: 'Token Program',
                    minValue: 150,
                    programId: tokenProgramId,
                    reservedValue: 0,
                },
                {
                    computeUnits: 0,
                    displayUnits: DEFAULT_RESERVED_CU,
                    instructionTitle: 'System Program',
                    minValue: 150,
                    programId: systemProgramId,
                    reservedValue: 150,
                },
            ]);
        });

        it('should handle instructionLogs shorter than instructions', () => {
            const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
            const systemProgramId = '11111111111111111111111111111111';
            const memoProgramId = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
            const instructions = [
                mockInstruction(tokenProgramId),
                mockInstruction(systemProgramId),
                mockInstruction(memoProgramId),
            ];
            const instructionLogs = [
                mockInstructionLog(5000),
                // Missing logs for instruction 2 and 3 (e.g., tx failed)
            ];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                computeUnits: 5000,
                instructionTitle: 'Token Program',
                minValue: 150,
                programId: tokenProgramId,
            });
            expect(result[1]).toEqual({
                computeUnits: 0,
                displayUnits: DEFAULT_RESERVED_CU,
                instructionTitle: 'System Program',
                minValue: 150,
                programId: systemProgramId,
                reservedValue: 150,
            });
            expect(result[2]).toEqual({
                computeUnits: 0,
                displayUnits: DEFAULT_RESERVED_CU,
                instructionTitle: 'Memo Program: Memo',
                minValue: 150,
                programId: memoProgramId,
                reservedValue: 0,
            });
        });

        it('should handle transaction with mix of successful and failed instructions', () => {
            const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
            const systemProgramId = '11111111111111111111111111111111';
            const memo1ProgramId = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';
            const instructions = [
                mockInstruction(tokenProgramId),
                mockInstruction(systemProgramId),
                mockInstruction(memo1ProgramId), // failed
            ];
            const instructionLogs = [
                mockInstructionLog(5000),
                mockInstructionLog(0), // System program used minimum
                // No log for third instruction (it failed before logging)
            ];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toEqual([
                {
                    computeUnits: 5000,
                    instructionTitle: 'Token Program',
                    minValue: 150,
                    programId: tokenProgramId,
                },
                {
                    computeUnits: 0,
                    displayUnits: DEFAULT_RESERVED_CU,
                    instructionTitle: 'System Program',
                    minValue: 150,
                    programId: systemProgramId,
                    reservedValue: 150,
                },
                {
                    computeUnits: 0,
                    displayUnits: DEFAULT_RESERVED_CU,
                    instructionTitle: 'Memo Program v1',
                    minValue: 150,
                    programId: memo1ProgramId,
                    reservedValue: 0,
                },
            ]);
        });
    });
});
