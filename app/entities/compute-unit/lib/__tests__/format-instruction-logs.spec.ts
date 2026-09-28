import { gen } from '@__fixtures__/gen';
import { type Address, address } from '@solana/kit';
import { ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS } from '@solana-program/address-lookup-table';
import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from '@solana-program/compute-budget';
import { STAKE_PROGRAM_ADDRESS } from '@solana-program/stake';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { Cluster } from '@utils/cluster';
import { type InstructionLogs, parseProgramLogs } from '@utils/program-logs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('@/app/shared/lib/logger', () => ({ Logger: { error: vi.fn(), warn } }));

import { formatInstructionLogs } from '../format-instruction-logs';

afterEach(() => vi.clearAllMocks());

describe('formatInstructionLogs', () => {
    describe('positive cases: basic functionality', () => {
        it('should format single instruction with CU consumption', () => {
            const instructions = [mockInstruction(TOKEN_PLACEHOLDER)];
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
                    defaultUnits: 0,
                    programId: TOKEN_PLACEHOLDER,
                    scheduledUnits: DEFAULT_RESERVED_CU,
                },
            ]);
        });

        it('should format multiple instructions with varying CU', () => {
            const instructions = [
                mockInstruction(TOKEN_PLACEHOLDER),
                mockInstruction(SYSTEM_PLACEHOLDER),
                mockInstruction(MEMO_PLACEHOLDER),
            ];
            const instructionLogs = [mockInstructionLog(5000), mockInstructionLog(150), mockInstructionLog(1000)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toHaveLength(3);
            expect(result.map(r => [r.programId, r.computeUnits])).toEqual([
                [TOKEN_PLACEHOLDER, 5000],
                [SYSTEM_PLACEHOLDER, 150],
                [MEMO_PLACEHOLDER, 1000],
            ]);
        });

        it('should pass through resolved instruction and program names', () => {
            const instructions = [
                { ...mockInstruction(TOKEN_PLACEHOLDER), name: 'Transfer Checked', programName: 'Token Program' },
                mockInstruction(SYSTEM_PLACEHOLDER),
            ];
            const instructionLogs = [mockInstructionLog(105), mockInstructionLog(150)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result[0]).toMatchObject({ name: 'Transfer Checked', programName: 'Token Program' });
            expect(result[1].name).toBeUndefined();
            expect(result[1].programName).toBeUndefined();
        });

        it('should carry a non-zero schedule reserve on every pre-v1 row, logged or not', () => {
            const instructions = [mockInstruction(TOKEN_PLACEHOLDER), mockInstruction(UNKNOWN_PLACEHOLDER)];
            const instructionLogs = [mockInstructionLog(5000), mockInstructionLog(0)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result.map(r => r.scheduledUnits)).toEqual([DEFAULT_RESERVED_CU, DEFAULT_RESERVED_CU]);
            expect(result.every(r => (r.scheduledUnits ?? 0) > 0)).toBe(true);
        });

        it('should report 0 default units for a program that is not a builtin', () => {
            const instructions = [mockInstruction(UNKNOWN_PLACEHOLDER)];
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
                    defaultUnits: 0,
                    programId: UNKNOWN_PLACEHOLDER,
                    scheduledUnits: DEFAULT_RESERVED_CU,
                },
            ]);
        });

        it('should calculate defaultUnits for known built-in programs', () => {
            const instructions = [
                mockInstruction(SYSTEM_PROGRAM_ADDRESS),
                mockInstruction(ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS),
                mockInstruction(STAKE_PROGRAM_ADDRESS),
                mockInstruction(VOTE_PROGRAM_ADDRESS),
                mockInstruction(COMPUTE_BUDGET_PROGRAM_ADDRESS),
            ];
            const instructionLogs = instructions.map(() => mockInstructionLog(0));

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result.map(r => [r.programId, r.defaultUnits])).toEqual([
                [SYSTEM_PROGRAM_ADDRESS, 150],
                [ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS, 750],
                [STAKE_PROGRAM_ADDRESS, 750],
                [VOTE_PROGRAM_ADDRESS, 2100],
                [COMPUTE_BUDGET_PROGRAM_ADDRESS, 150],
            ]);
        });

        it('should carry a builtin default even when the logs reported a figure', () => {
            const instructions = [mockInstruction(SYSTEM_PROGRAM_ADDRESS)];
            const instructionLogs = [mockInstructionLog(5000)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result[0]).toEqual({
                computeUnits: 5000,
                defaultUnits: 150,
                programId: SYSTEM_PROGRAM_ADDRESS,
                scheduledUnits: DEFAULT_RESERVED_CU,
            });
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
            const instructions = [mockInstruction(TOKEN_PLACEHOLDER), mockInstruction(SYSTEM_PLACEHOLDER)];
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
                    defaultUnits: 0,
                    programId: TOKEN_PLACEHOLDER,
                    scheduledUnits: DEFAULT_RESERVED_CU,
                },
                {
                    computeUnits: 0,
                    defaultUnits: 0,
                    programId: SYSTEM_PLACEHOLDER,
                    scheduledUnits: DEFAULT_RESERVED_CU,
                },
            ]);
        });

        it('should handle instructionLogs shorter than instructions', () => {
            const instructions = [
                mockInstruction(TOKEN_PLACEHOLDER),
                mockInstruction(SYSTEM_PLACEHOLDER),
                mockInstruction(MEMO_PLACEHOLDER),
            ];
            const instructionLogs = [mockInstructionLog(5000)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result).toHaveLength(3);
            expect(result.map(r => r.computeUnits)).toEqual([5000, 0, 0]);
        });

        it('should handle transaction with mix of successful and failed instructions', () => {
            const instructions = [
                mockInstruction(TOKEN_PLACEHOLDER),
                mockInstruction(SYSTEM_PLACEHOLDER),
                mockInstruction(UNKNOWN_PLACEHOLDER),
            ];
            const instructionLogs = [mockInstructionLog(5000), mockInstructionLog(0)];

            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs,
                instructions,
            });

            expect(result.map(r => [r.programId, r.computeUnits])).toEqual([
                [TOKEN_PLACEHOLDER, 5000],
                [SYSTEM_PLACEHOLDER, 0],
                [UNKNOWN_PLACEHOLDER, 0],
            ]);
        });
    });

    /**
     * Row `i` is paired with the `i`th top-level invocation, so the two lists must line up. Only one
     * direction is a defect: a top-level invocation is logged for every instruction that executed, so
     * fewer than the instruction count is the ordinary shape of a failed transaction (covered above),
     * while more means the caller filtered or reordered rows and every later figure lands on the wrong
     * instruction.
     */
    describe('index alignment with the logs', () => {
        it('should report more top-level invocations than instructions', () => {
            formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockInstructionLog(5000), mockInstructionLog(100)],
                instructions: [mockInstruction(TOKEN_PLACEHOLDER)],
            });

            expect(warn).toHaveBeenCalledWith(expect.stringContaining('misalign'), {
                instructionCount: 1,
                invocationCount: 2,
            });
        });

        it('should not send the report to Sentry', () => {
            formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockInstructionLog(5000), mockInstructionLog(100)],
                instructions: [mockInstruction(TOKEN_PLACEHOLDER)],
            });

            expect(warn).toHaveBeenCalledWith(
                expect.any(String),
                expect.not.objectContaining({ sentry: expect.anything() }),
            );
        });

        it('should stay silent when a failed transaction logs fewer instructions than it carries', () => {
            formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockInstructionLog(5000)],
                instructions: [mockInstruction(TOKEN_PLACEHOLDER), mockInstruction(SYSTEM_PLACEHOLDER)],
            });

            expect(warn).not.toHaveBeenCalled();
        });

        it('should stay silent when the caller resolved no instructions', () => {
            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockInstructionLog(5000), mockInstructionLog(100)],
                instructions: [],
            });

            expect(result).toEqual([]);
            expect(warn).not.toHaveBeenCalled();
        });
    });

    /**
     * `parseProgramLogs` opens an entry with no `invokedProgram` for a log line that arrives while no
     * invocation is in progress, and for a runtime error that produced no logs at all. Neither stands for
     * an instruction, so pairing them by raw index shifts every later CU figure onto the wrong row.
     */
    describe('log entries that belong to no instruction', () => {
        it('should keep the figures aligned when an orphan entry precedes the real ones', () => {
            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockOrphanLog(), mockInstructionLog(5000), mockInstructionLog(3000)],
                instructions: [mockInstruction(TOKEN_PLACEHOLDER), mockInstruction(MEMO_PLACEHOLDER)],
            });

            expect(result.map(r => [r.programId, r.computeUnits])).toEqual([
                [TOKEN_PLACEHOLDER, 5000],
                [MEMO_PLACEHOLDER, 3000],
            ]);
        });

        it('should not report misalignment for a trailing orphan entry', () => {
            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockInstructionLog(5000), mockOrphanLog()],
                instructions: [mockInstruction(TOKEN_PLACEHOLDER)],
            });

            expect(result.map(r => r.computeUnits)).toEqual([5000]);
            expect(warn).not.toHaveBeenCalled();
        });

        it('should leave every row unlogged when the only entry is an orphan', () => {
            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockOrphanLog()],
                instructions: [mockInstruction(TOKEN_PLACEHOLDER), mockInstruction(MEMO_PLACEHOLDER)],
            });

            expect(result.map(r => r.computeUnits)).toEqual([0, 0]);
            expect(warn).not.toHaveBeenCalled();
        });
    });

    /**
     * Against the real producer, because the defect was a mismatch between what `parseProgramLogs`
     * returns and what this module assumed it returns — hand-built entries cannot catch that drifting.
     */
    describe('paired with parseProgramLogs output', () => {
        const SYSTEM = SYSTEM_PROGRAM_ADDRESS;
        const TOKEN = TOKEN_PROGRAM_ADDRESS;

        const format = (logs: string[], programIds: Address[]) =>
            formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: parseProgramLogs(logs, null, Cluster.MainnetBeta),
                instructions: programIds.map(mockInstruction),
            });

        it('should pair a well-formed transaction row for row', () => {
            const result = format(
                [
                    `Program ${SYSTEM} invoke [1]`,
                    `Program ${SYSTEM} success`,
                    `Program ${TOKEN} invoke [1]`,
                    `Program ${TOKEN} consumed 105 of 2408 compute units`,
                    `Program ${TOKEN} success`,
                ],
                [SYSTEM, TOKEN],
            );

            expect(result.map(r => r.computeUnits)).toEqual([0, 105]);
            expect(warn).not.toHaveBeenCalled();
        });

        it('should not shift figures when a runtime line precedes the invocations', () => {
            const result = format(
                [
                    'Transfer: insufficient lamports 100, need 200',
                    `Program ${SYSTEM} success`,
                    `Program ${SYSTEM} invoke [1]`,
                    `Program ${SYSTEM} consumed 5000 of 200000 compute units`,
                    `Program ${SYSTEM} success`,
                    `Program ${TOKEN} invoke [1]`,
                    `Program ${TOKEN} consumed 3000 of 195000 compute units`,
                    `Program ${TOKEN} success`,
                ],
                [SYSTEM, TOKEN],
            );

            expect(result.map(r => r.computeUnits)).toEqual([5000, 3000]);
        });

        it('should not report misalignment for a trailing runtime line', () => {
            format(
                [`Program ${SYSTEM} invoke [1]`, `Program ${SYSTEM} success`, 'Some trailing runtime line'],
                [SYSTEM],
            );

            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe('v1 transaction tests', () => {
        it('should leave scheduledUnits absent because v1 reserves nothing per instruction', () => {
            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockInstructionLog(150)],
                instructions: [mockInstruction(TOKEN_PLACEHOLDER)],
                transactionVersion: 1,
            });

            expect(result[0].scheduledUnits).toBeUndefined();
        });

        it('should still report the measured CU when v1 leaves no reserve', () => {
            const result = formatInstructionLogs({
                cluster: Cluster.MainnetBeta,
                epoch: 0n,
                instructionLogs: [mockInstructionLog(150)],
                instructions: [mockInstruction(TOKEN_PLACEHOLDER)],
                transactionVersion: 1,
            });

            expect(result[0].computeUnits).toBe(150);
            expect(result[0].scheduledUnits).toBeUndefined();
        });
    });
});

const DEFAULT_RESERVED_CU = 200_000;

const VOTE_PROGRAM_ADDRESS = address('Vote111111111111111111111111111111111111111');

const TOKEN_PLACEHOLDER = gen.vanityAddress('Token');
const SYSTEM_PLACEHOLDER = gen.vanityAddress('System');
const MEMO_PLACEHOLDER = gen.vanityAddress('Memo');
const UNKNOWN_PLACEHOLDER = gen.vanityAddress('Unknown');

function mockInstruction(programId: string) {
    return { programId: address(programId) };
}

function mockInstructionLog(computeUnits: number, invokedProgram = 'TestProgram'): InstructionLogs {
    return {
        computeUnits,
        failed: false,
        invokedProgram,
        logs: [],
        truncated: false,
    };
}

function mockOrphanLog(computeUnits = 0): InstructionLogs {
    return { computeUnits, failed: false, invokedProgram: null, logs: [], truncated: false };
}
