import { ComputeBudgetProgram, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { ComputeBudgetInstruction, identifyComputeBudgetInstruction } from '@solana-program/compute-budget';
import bs58 from 'bs58';

import { camelToTitleCase } from '.';
import { Cluster } from './cluster';
import { getReservedComputeUnits } from './compute-units-schedule';
import { getDefaultComputeUnits } from './default-compute-units';
import { InstructionLogs } from './program-logs';
import { getProgramName } from './tx';

export type InstructionCUData = {
    programId: string;
    instructionTitle: string;
    computeUnits: number;
    displayUnits?: number;
    reservedValue?: number;
    minValue: number;
};

const MIN_VALUE = 150;

function getComputeBudgetInstructionName(
    instruction: ParsedInstruction | PartiallyDecodedInstruction
): string | undefined {
    try {
        if (!ComputeBudgetProgram.programId.equals(instruction.programId)) {
            return undefined;
        }

        if (!('data' in instruction) || !instruction.data) {
            return undefined;
        }

        const dataBuffer =
            typeof instruction.data === 'string'
                ? Buffer.from(bs58.decode(instruction.data))
                : Buffer.from(instruction.data);

        const type = identifyComputeBudgetInstruction(dataBuffer);

        // Map instruction type to readable name
        const typeMap: Record<ComputeBudgetInstruction, string> = {
            [ComputeBudgetInstruction.RequestUnits]: 'requestUnits',
            [ComputeBudgetInstruction.RequestHeapFrame]: 'requestHeapFrame',
            [ComputeBudgetInstruction.SetComputeUnitLimit]: 'setComputeUnitLimit',
            [ComputeBudgetInstruction.SetComputeUnitPrice]: 'setComputeUnitPrice',
            [ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit]: 'setLoadedAccountsDataSizeLimit',
        };

        return typeMap[type];
    } catch {
        return undefined;
    }
}

function getInstructionTitle(programName: string, instructionType?: string): string {
    if (!instructionType) {
        return programName;
    }

    const formattedType = camelToTitleCase(instructionType);
    return `${programName}: ${formattedType}`;
}

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
        const programName = getProgramName(programId, cluster);

        // Extract instruction name from parsed instruction if available
        let instructionName: string | undefined;
        if ('parsed' in instruction && instruction.parsed && typeof instruction.parsed === 'object') {
            const parsed = instruction.parsed as { type?: string };
            instructionName = parsed.type;
        }

        // If no instruction name found, try to extract Compute Budget instruction name
        if (!instructionName) {
            instructionName = getComputeBudgetInstructionName(instruction as any);
        }

        // Special case for Memo Program - it only has one instruction type
        if (!instructionName && programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
            instructionName = 'memo';
        }

        const instructionTitle = getInstructionTitle(programName, instructionName);

        const logEntry = instructionLogs[index];
        const computeUnits = logEntry?.computeUnits ?? 0;

        const reservedValue = getDefaultComputeUnits(programId);
        const displayUnits = getReservedComputeUnits({ cluster, epoch, programId });

        const cuData: InstructionCUData = {
            ...(computeUnits === 0 ? { reservedValue } : {}),
            ...(computeUnits === 0 ? { displayUnits } : {}),
            computeUnits,
            instructionTitle,
            minValue: MIN_VALUE,
            programId,
        };

        result.push(cuData);
    });

    return result;
}
