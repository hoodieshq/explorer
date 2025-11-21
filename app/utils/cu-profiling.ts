import { InstructionCUData } from '@components/transaction/CUProfilingCard';
import { Cluster } from '@utils/cluster';
import { getReservedComputeUnits } from '@utils/compute-units-schedule';
import { InstructionLogs } from '@utils/program-logs';

/**
 * Extract CU profiling data from transaction signature context
 *
 * @param instructions - The transaction instructions with programId
 * @param instructionLogs - The parsed instruction logs containing compute units
 * @param cluster - The cluster the transaction is on
 * @param epoch - The epoch of the transaction
 * @returns Array of instruction CU data
 */
export function extractCUDataFromTransaction({
    instructions,
    instructionLogs,
    cluster,
    epoch,
}: {
    instructions: Array<{ programId: { toBase58(): string } }>;
    instructionLogs: InstructionLogs[];
    cluster: Cluster;
    epoch?: bigint;
}): InstructionCUData[] {
    const result: InstructionCUData[] = [];

    instructions.forEach((instruction, index) => {
        const programId = instruction.programId.toBase58();

        const logEntry = instructionLogs[index];
        let computeUnits = logEntry?.computeUnits || 0;

        if (computeUnits === 0) {
            computeUnits = getReservedComputeUnits({
                cluster,
                epoch,
                programId,
            });
        }

        result.push({
            computeUnits,
            programId,
        });
    });

    return result.filter(ix => ix.computeUnits > 0);
}
