import { InstructionLogs } from './program-logs';

export type InstructionCUData = {
    programId: string;
    computeUnits: number;

    // Display hint for UI when computeUnits is 0.
    displayUnits?: string;
};

// Default minimum CU value to display for instructions that consumed 0 CU
export const DEFAULT_MIN_CU = 3000;

/**
 * Formats transaction instructions and their corresponding logs into compute unit data
 * @param instructions - Array of transaction instructions with programId
 * @param instructionLogs - Array of parsed instruction logs containing CU consumption
 * @returns Array of InstructionCUData mapping each instruction to its CU consumption
 *
 * @example
 * // Transaction with 3 instructions, only 2 have logs
 * const instructions = [
 *   { programId: { toBase58: () => 'TokenProgramId' } },
 *   { programId: { toBase58: () => 'SystemProgramId' } },
 *   { programId: { toBase58: () => 'MemoProgramId' } }
 * ];
 *
 * const instructionLogs = [
 *   { computeUnits: 5000, logs: [...], invokedProgram: 'Token', truncated: false, failed: false },
 *   { computeUnits: 0, logs: [...], invokedProgram: 'System', truncated: false, failed: false }
 *   // Note: Missing third entry - transaction may have failed
 * ];
 *
 * const result = formatInstructionLogs({ instructions, instructionLogs });
 * // [
 * //   { programId: 'TokenProgramId', computeUnits: 5000 },
 * //   { programId: 'SystemProgramId', computeUnits: 0, displayUnits: '~3,000' },
 * //   { programId: 'MemoProgramId', computeUnits: 0, displayUnits: '~3,000' }
 * // ]
 */
export function formatInstructionLogs({
    instructions,
    instructionLogs,
}: {
    instructions: Array<{ programId: { toBase58(): string } }>;
    instructionLogs: InstructionLogs[];
}): InstructionCUData[] {
    const result: InstructionCUData[] = [];

    instructions.forEach((instruction, index) => {
        const programId = instruction.programId.toBase58();

        const logEntry = instructionLogs[index];
        const computeUnits = logEntry?.computeUnits ?? 0;

        const cuData: InstructionCUData = {
             // Add display default value when CU == 0
            ...(computeUnits === 0 ? { displayUnits: `~${DEFAULT_MIN_CU.toLocaleString()}` } : {}),
            computeUnits,
            programId,
        };

        result.push(cuData);
    });

    return result;
}
