import {
    DEFAULT_MIN_CU,
    formatInstructionLogs,
} from '../cu-profiling';
import { InstructionLogs } from '../program-logs';

// create mock instruction with programId
function mockInstruction(programId: string) {
    return {
        programId: {
            toBase58: () => programId,
        },
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
            const instructions = [mockInstruction('TokenProgram')];
            const instructionLogs = [mockInstructionLog(5000)];

            const result = formatInstructionLogs({ instructionLogs, instructions });

            expect(result).toEqual([
                {
                    computeUnits: 5000,
                    programId: 'TokenProgram',
                },
            ]);
        });

        it('should format multiple instructions with varying CU', () => {
            const instructions = [
                mockInstruction('TokenProgram'),
                mockInstruction('SystemProgram'),
                mockInstruction('MemoProgram'),
            ];
            const instructionLogs = [mockInstructionLog(5000), mockInstructionLog(150), mockInstructionLog(1000)];

            const result = formatInstructionLogs({ instructionLogs, instructions });

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ computeUnits: 5000, programId: 'TokenProgram' });
            expect(result[1]).toEqual({ computeUnits: 150, programId: 'SystemProgram' });
            expect(result[2]).toEqual({ computeUnits: 1000, programId: 'MemoProgram' });
        });

        it('should add displayUnits for instructions with 0 CU', () => {
            const instructions = [mockInstruction('SystemProgram')];
            const instructionLogs = [mockInstructionLog(0)];

            const result = formatInstructionLogs({ instructionLogs, instructions });

            expect(result).toEqual([
                {
                    computeUnits: 0,
                    displayUnits: `~${DEFAULT_MIN_CU.toLocaleString()}`,
                    programId: 'SystemProgram',
                },
            ]);
        });

        it('should not add displayUnits for instructions with non-zero CU', () => {
            const instructions = [mockInstruction('TokenProgram')];
            const instructionLogs = [mockInstructionLog(5000)];

            const result = formatInstructionLogs({ instructionLogs, instructions });

            expect(result[0]).not.toHaveProperty('displayUnits');
        });
    });

    describe('negative cases: empty/missing data', () => {
        it('should handle empty instructions array', () => {
            const result = formatInstructionLogs({ instructionLogs: [], instructions: [] });

            expect(result).toEqual([]);
        });

        it('should handle empty instructionLogs array', () => {
            const instructions = [mockInstruction('TokenProgram'), mockInstruction('SystemProgram')];
            const instructionLogs: InstructionLogs[] = [];

            const result = formatInstructionLogs({ instructionLogs, instructions });

            expect(result).toEqual([
                {
                    computeUnits: 0,
                    displayUnits: `~${DEFAULT_MIN_CU.toLocaleString()}`,
                    programId: 'TokenProgram',
                },
                {
                    computeUnits: 0,
                    displayUnits: `~${DEFAULT_MIN_CU.toLocaleString()}`,
                    programId: 'SystemProgram',
                },
            ]);
        });

        it('should handle instructionLogs shorter than instructions', () => {
            const instructions = [
                mockInstruction('TokenProgram'),
                mockInstruction('SystemProgram'),
                mockInstruction('MemoProgram'),
            ];
            const instructionLogs = [
                mockInstructionLog(5000),
                // Missing logs for instruction 2 and 3 (e.g., tx failed)
            ];

            const result = formatInstructionLogs({ instructionLogs, instructions });

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ computeUnits: 5000, programId: 'TokenProgram' });
            expect(result[1]).toEqual({
                computeUnits: 0,
                displayUnits: `~${DEFAULT_MIN_CU.toLocaleString()}`,
                programId: 'SystemProgram',
            });
            expect(result[2]).toEqual({
                computeUnits: 0,
                displayUnits: `~${DEFAULT_MIN_CU.toLocaleString()}`,
                programId: 'MemoProgram',
            });
        });

        it('should handle transaction with mix of successful and failed instructions', () => {
            const instructions = [
                mockInstruction('TokenProgram'),
                mockInstruction('SystemProgram'),
                mockInstruction('UnknownProgram'), // failed
            ];
            const instructionLogs = [
                mockInstructionLog(5000),
                mockInstructionLog(0), // System program used minimum
                // No log for third instruction (it failed before logging)
            ];

            const result = formatInstructionLogs({ instructionLogs, instructions });

            expect(result).toEqual([
                { computeUnits: 5000, programId: 'TokenProgram' },
                {
                    computeUnits: 0,
                    displayUnits: `~${DEFAULT_MIN_CU.toLocaleString()}`,
                    programId: 'SystemProgram',
                },
                {
                    computeUnits: 0,
                    displayUnits: `~${DEFAULT_MIN_CU.toLocaleString()}`,
                    programId: 'UnknownProgram',
                },
            ]);
        });
    });
});
