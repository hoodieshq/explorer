import { Cluster } from './cluster';
import { getReservedComputeUnits } from './compute-units-schedule';
import { getDefaultComputeUnits } from './default-compute-units';
import { InstructionLogs } from './program-logs';

export type InstructionCUData = {
    programId: string;
    computeUnits: number;

    // а надо ли теперь???
    displayUnits?: string;

    // Reserved compute units value (used when computeUnits is 0)
    reservedValue?: number;
};

/**
 * Formats transaction instructions and their corresponding logs into compute unit data
 * @param instructions - Array of transaction instructions with programId
 * @param instructionLogs - Array of parsed instruction logs containing CU consumption
 * @param cluster - The cluster to use for epoch-aware lookups
 * @param epoch - Optional epoch for historical lookups
 * @returns Array of InstructionCUData mapping each instruction to its CU consumption
 */
export function formatInstructionLogs({
    instructions,
    instructionLogs,
    cluster,
    epoch,
}: {
    instructions: Array<{ programId: { toBase58(): string } }>;
    instructionLogs: InstructionLogs[];
    cluster: Cluster;
    epoch: bigint;
}): InstructionCUData[] {
    const result: InstructionCUData[] = [];

    instructions.forEach((instruction, index) => {
        const programId = instruction.programId.toBase58();

        const logEntry = instructionLogs[index];
        const computeUnits = logEntry?.computeUnits ?? 0;

        // Get the reserved compute units from the default values
        const defaultValue = getDefaultComputeUnits(programId);
        const reservedValue =
            defaultValue ?? getReservedComputeUnits({ cluster, epoch, programId });

        const cuData: InstructionCUData = {
            computeUnits,
            // Add display value when CU == 0
            ...(computeUnits === 0 ? { displayUnits: `~${reservedValue.toLocaleString()}` } : {}),
            programId,
            // Add reserved value when CU == 0
            ...(computeUnits === 0 ? { reservedValue } : {}),
        };

        result.push(cuData);
    });

    return result;
}
