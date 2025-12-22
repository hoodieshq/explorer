import { ComputeBudgetProgram, ParsedInstruction, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { ComputeBudgetInstruction, identifyComputeBudgetInstruction } from '@solana-program/compute-budget';
import {
    AssociatedTokenInstruction,
    CREATE_ASSOCIATED_TOKEN_DISCRIMINATOR,
    identifyAssociatedTokenInstruction,
    identifyTokenInstruction,
    TokenInstruction,
} from '@solana-program/token';
import bs58 from 'bs58';

import { camelToTitleCase } from '.';
import { Cluster } from './cluster';
import { getReservedComputeUnits } from './compute-units-schedule';
import { getDefaultComputeUnits } from './default-compute-units';
import { InstructionLogs } from './program-logs';
import { getProgramName } from './tx';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export type InstructionCUData = {
    programId: string;
    instructionTitle: string;
    computeUnits: number;
    displayUnits?: number;
    reservedValue?: number;
    minValue: number;
};

const MIN_VALUE = 150;

function getInstructionDataBuffer(data: string | Uint8Array): Buffer {
    return typeof data === 'string' ? Buffer.from(bs58.decode(data)) : Buffer.from(data);
}

function getParsedInstructionType(instruction: ParsedInstruction | PartiallyDecodedInstruction): string | undefined {
    if ('parsed' in instruction && instruction.parsed && typeof instruction.parsed === 'object') {
        const parsed = instruction.parsed as { type?: string };
        return parsed.type;
    }
    return undefined;
}

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

        const dataBuffer = getInstructionDataBuffer(instruction.data);
        const type = identifyComputeBudgetInstruction(dataBuffer);

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

function getATAInstructionName(instruction: ParsedInstruction | PartiallyDecodedInstruction): string | undefined {
    try {
        if (!ASSOCIATED_TOKEN_PROGRAM_ID.equals(instruction.programId)) {
            return undefined;
        }

        const parsedType = getParsedInstructionType(instruction);
        if (parsedType) {
            return parsedType;
        }

        if ('data' in instruction && instruction.data) {
            let dataBuffer = getInstructionDataBuffer(instruction.data);

            if (dataBuffer.equals(Buffer.alloc(CREATE_ASSOCIATED_TOKEN_DISCRIMINATOR))) {
                dataBuffer = Buffer.from(Uint8Array.from([CREATE_ASSOCIATED_TOKEN_DISCRIMINATOR]));
            }

            const instructionType = identifyAssociatedTokenInstruction(dataBuffer);

            switch (instructionType) {
                case AssociatedTokenInstruction.CreateAssociatedToken:
                    return 'create';
                case AssociatedTokenInstruction.CreateAssociatedTokenIdempotent:
                    return 'createIdempotent';
                case AssociatedTokenInstruction.RecoverNestedAssociatedToken:
                    return 'recoverNested';
                default:
                    return undefined;
            }
        }

        return undefined;
    } catch {
        return undefined;
    }
}

function getTokenInstructionName(instruction: ParsedInstruction | PartiallyDecodedInstruction): string | undefined {
    try {
        const isTokenProgram =
            TOKEN_PROGRAM_ID.equals(instruction.programId) || TOKEN_2022_PROGRAM_ID.equals(instruction.programId);

        if (!isTokenProgram) {
            return undefined;
        }

        const parsedType = getParsedInstructionType(instruction);
        if (parsedType) {
            return parsedType;
        }

        if ('data' in instruction && instruction.data) {
            const dataBuffer = getInstructionDataBuffer(instruction.data);
            const type = identifyTokenInstruction(dataBuffer);

            const typeMap: Record<TokenInstruction, string> = {
                [TokenInstruction.InitializeMint]: 'initializeMint',
                [TokenInstruction.InitializeAccount]: 'initializeAccount',
                [TokenInstruction.InitializeMultisig]: 'initializeMultisig',
                [TokenInstruction.Transfer]: 'transfer',
                [TokenInstruction.Approve]: 'approve',
                [TokenInstruction.Revoke]: 'revoke',
                [TokenInstruction.SetAuthority]: 'setAuthority',
                [TokenInstruction.MintTo]: 'mintTo',
                [TokenInstruction.Burn]: 'burn',
                [TokenInstruction.CloseAccount]: 'closeAccount',
                [TokenInstruction.FreezeAccount]: 'freezeAccount',
                [TokenInstruction.ThawAccount]: 'thawAccount',
                [TokenInstruction.TransferChecked]: 'transferChecked',
                [TokenInstruction.ApproveChecked]: 'approveChecked',
                [TokenInstruction.MintToChecked]: 'mintToChecked',
                [TokenInstruction.BurnChecked]: 'burnChecked',
                [TokenInstruction.InitializeAccount2]: 'initializeAccount2',
                [TokenInstruction.SyncNative]: 'syncNative',
                [TokenInstruction.InitializeAccount3]: 'initializeAccount3',
                [TokenInstruction.InitializeMultisig2]: 'initializeMultisig2',
                [TokenInstruction.InitializeMint2]: 'initializeMint2',
                [TokenInstruction.GetAccountDataSize]: 'getAccountDataSize',
                [TokenInstruction.InitializeImmutableOwner]: 'initializeImmutableOwner',
                [TokenInstruction.AmountToUiAmount]: 'amountToUiAmount',
                [TokenInstruction.UiAmountToAmount]: 'uiAmountToAmount',
            };

            return typeMap[type];
        }

        return undefined;
    } catch {
        return undefined;
    }
}

export function getInstructionName(instruction: ParsedInstruction | PartiallyDecodedInstruction): string | undefined {
    const parsedType = getParsedInstructionType(instruction);
    if (parsedType) {
        return parsedType;
    }

    const computeBudgetName = getComputeBudgetInstructionName(instruction);
    if (computeBudgetName) {
        return computeBudgetName;
    }

    const ataName = getATAInstructionName(instruction);
    if (ataName) {
        return ataName;
    }

    const tokenName = getTokenInstructionName(instruction);
    if (tokenName) {
        return tokenName;
    }

    if (MEMO_PROGRAM_ID.equals(instruction.programId)) {
        return 'memo';
    }

    return undefined;
}

export function getInstructionTitle(programName: string, instructionType?: string): string {
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

        const instructionName = getInstructionName(instruction as any);

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
