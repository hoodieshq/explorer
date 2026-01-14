import { privateIntoParsedData } from '@components/inspector/into-parsed-data';
import {
    ComputeBudgetProgram,
    ParsedInstruction,
    PartiallyDecodedInstruction,
    PublicKey,
    TransactionInstruction,
} from '@solana/web3.js';
import { ComputeBudgetInstruction, identifyComputeBudgetInstruction } from '@solana-program/compute-budget';
import { MEMO_PROGRAM_ADDRESS } from '@solana-program/memo';
import {
    ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    identifyTokenInstruction,
    TOKEN_PROGRAM_ADDRESS,
    TokenInstruction,
} from '@solana-program/token';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import bs58 from 'bs58';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ADDRESS);
const TOKEN_PROGRAM_ID = new PublicKey(TOKEN_PROGRAM_ADDRESS);
const TOKEN_2022_PROGRAM_ID = new PublicKey(TOKEN_2022_PROGRAM_ADDRESS);
const MEMO_PROGRAM_ID = new PublicKey(MEMO_PROGRAM_ADDRESS);

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

type TInstruction = ParsedInstruction | PartiallyDecodedInstruction;
type TInstructionNameReturnType = string | undefined;

function getComputeBudgetInstructionName(
    instruction: TInstruction
): TInstructionNameReturnType {
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

function getATAInstructionName(instruction: TInstruction): TInstructionNameReturnType {
    try {
        if (!ASSOCIATED_TOKEN_PROGRAM_ID.equals(instruction.programId)) {
            return undefined;
        }

        if ('data' in instruction && instruction.data) {
            const transactionInstruction = new TransactionInstruction({
                data: getInstructionDataBuffer(instruction.data),
                keys: [],
                programId: instruction.programId,
            });

            const parsed = privateIntoParsedData(transactionInstruction);
            return parsed.type || undefined;
        }

        return undefined;
    } catch {
        return undefined;
    }
}

function getTokenInstructionName(instruction: TInstruction): TInstructionNameReturnType {
    try {
        const isTokenProgram =
            TOKEN_PROGRAM_ID.equals(instruction.programId) || TOKEN_2022_PROGRAM_ID.equals(instruction.programId);

        if (!isTokenProgram) {
            return undefined;
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

export function getInstructionName(instruction: TInstruction): TInstructionNameReturnType {
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
