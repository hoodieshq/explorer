import type { ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';

import type { TokenInfo } from '../api/get-token-info';
import { extractMemoFromTransaction } from './memo';
import type { ReceiptToken } from './types';

type TokenTransferParsed =
    | {
          type: 'transferChecked';
          info: {
              source?: string;
              destination?: string;
              authority?: string;
              mint?: string;
              tokenAmount?: {
                  uiAmountString?: string | null;
                  amount?: string;
                  decimals?: number;
              };
          };
      }
    | {
          type: 'transfer2';
          info: {
              source?: string;
              destination?: string;
              authority?: string;
              mint?: string;
              tokenAmount?: {
                  uiAmountString?: string | null;
                  amount?: string;
                  decimals?: number;
              };
          };
      }
    | {
          type: 'transfer';
          info: {
              amount?: string;
              source?: string;
              destination?: string;
              authority?: string;
          };
      };

export async function createTokenTransferReceipt(
    transaction: ParsedTransactionWithMeta,
    getTokenInfo: (mint: string | undefined) => Promise<TokenInfo | undefined>
): Promise<ReceiptToken | null> {
    // There is a requirement to support only one token transfer instruction in a transaction
    const instructions = findTokenTransferInstructions(transaction);
    if (instructions.length !== 1) {
        return null;
    }
    const instruction = instructions[0];
    if (!('parsed' in instruction)) {
        return null;
    }

    const parsed: TokenTransferParsed = instruction.parsed;

    const total = extractTotal(parsed, transaction);
    const fee = transaction.meta?.fee;
    const date = transaction.blockTime;
    const memo = extractMemoFromTransaction(transaction);
    const sender = parsed.info.authority;
    const receiver = extractTokenReceiver(transaction, parsed.info.destination);
    const mint = extractTokenMint(transaction, parsed);

    if (!total || !fee || !date || !sender || !receiver) {
        return null;
    }

    const tokenInfo = await getTokenInfo(mint);

    return {
        date,
        fee,
        logoURI: tokenInfo?.logoURI,
        memo,
        mint,
        receiver,
        sender,
        symbol: tokenInfo?.symbol,
        total,
        type: 'token',
    };
}

function extractTokenReceiver(
    transaction: ParsedTransactionWithMeta,
    destinationTokenAccount: string | undefined
): string | undefined {
    if (!destinationTokenAccount) {
        return undefined;
    }

    const accountIndex = transaction.transaction.message.accountKeys.findIndex(
        account => account.pubkey.toString() === destinationTokenAccount
    );

    const tokenBalance = transaction.meta?.postTokenBalances?.find(balance => balance.accountIndex === accountIndex);

    return tokenBalance?.owner;
}

function extractTokenMint(transaction: ParsedTransactionWithMeta, parsed: TokenTransferParsed): string | undefined {
    if ('mint' in parsed.info) {
        return parsed.info.mint;
    }
    const destinationTokenAccount = parsed.info.destination;

    const accountIndex = transaction.transaction.message.accountKeys.findIndex(
        account => account.pubkey.toString() === destinationTokenAccount
    );

    const tokenBalance = transaction.meta?.postTokenBalances?.find(balance => balance.accountIndex === accountIndex);

    return tokenBalance?.mint;
}

function extractTotal(parsed: TokenTransferParsed, transaction: ParsedTransactionWithMeta): number {
    if (parsed.type === 'transferChecked' || parsed.type === 'transfer2') {
        return parseFloat(parsed.info.tokenAmount?.uiAmountString || '0');
    }

    if (!parsed.info.amount) return 0;
    const rawAmount = parseFloat(parsed.info.amount);

    const decimals = getTokenDecimals(transaction, parsed.info.destination || parsed.info.source);

    if (decimals !== undefined) {
        return rawAmount / Math.pow(10, decimals);
    }

    return rawAmount;
}

function getTokenDecimals(
    transaction: ParsedTransactionWithMeta,
    tokenAccount: string | undefined
): number | undefined {
    if (!tokenAccount) {
        return undefined;
    }
    const accountIndex = transaction.transaction.message.accountKeys.findIndex(
        account => account.pubkey.toString() === tokenAccount
    );

    const tokenBalance = transaction.meta?.postTokenBalances?.find(balance => balance.accountIndex === accountIndex);

    return tokenBalance?.uiTokenAmount.decimals;
}

function findTokenTransferInstructions(
    transaction: ParsedTransactionWithMeta
): (ParsedInstruction | PartiallyDecodedInstruction)[] {
    const { transaction: tx } = transaction;
    const instructions = tx.message.instructions.filter(
        instruction =>
            isTokenProgram(instruction.programId) &&
            'parsed' in instruction &&
            ['transfer', 'transferChecked', 'transfer2'].includes(instruction.parsed.type)
    );
    return instructions;
}

function isTokenProgram(programId: PublicKey): boolean {
    return (
        programId.equals(new PublicKey(TOKEN_PROGRAM_ADDRESS)) ||
        programId.equals(new PublicKey(TOKEN_2022_PROGRAM_ADDRESS))
    );
}
