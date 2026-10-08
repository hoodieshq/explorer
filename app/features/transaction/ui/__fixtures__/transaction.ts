import { DEFAULT_SIGNATURE } from '@__fixtures__/gen';
import type { RawTransaction } from '@entities/transaction-data';
import { createWeb3TransactionBytes } from '@entities/transaction-data/__fixtures__/wire-transactions';
import { fromRpcTransaction } from '@explorer/parsers/transaction';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';
import { PublicKey, SystemProgram, TransactionMessage, VersionedMessage } from '@solana/web3.js';
import {
    mockParsedTransactionDetails,
    mockRawTransactionDetails,
    mockTransactionStatus,
} from '@storybook-config/__fixtures__/transactions';

import { toBase64 } from '@/app/shared/lib/bytes';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

export { DEFAULT_SIGNATURE };

export const FEE_PAYER = new PublicKey('9noXzpXnkyEcKF3AeXqUHTdR59V5uvrRBUZ9bwfQwxNq');
export const RECIPIENT = new PublicKey('GsbwXfJraMomNxBcpR3DBr9yoWR2PmN93PEaYJz7MSTN');
export const TOKEN_ACCOUNT = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export const MOCK_STATUS = mockTransactionStatus();
export const MOCK_FAILED_STATUS = mockTransactionStatus({ err: { InstructionError: [0, 'GenericError'] } });

const BASE_TX = {
    blockTime: 1_716_000_000,
    meta: {
        // A System transfer consumes 150 units, and `costUnits` is the *executed* cost, so it has to
        // contain them. The pair is what mainnet reports for a single-signer transfer.
        computeUnitsConsumed: 150,
        costUnits: 1481,
        err: null,
        fee: 5000,
        innerInstructions: [],
        logMessages: [
            'Program 11111111111111111111111111111111 invoke [1]',
            'Program log: Transfer of 1 SOL',
            'Program 11111111111111111111111111111111 success',
        ],
        postBalances: [999_990_000, 1_001_000_000, 1_000_000_000, 1],
        postTokenBalances: [
            {
                accountIndex: 2,
                mint: TOKEN_MINT.toBase58(),
                owner: RECIPIENT.toBase58(),
                programId: TOKEN_ACCOUNT.toBase58(),
                uiTokenAmount: {
                    amount: '1500000',
                    decimals: 6,
                    uiAmount: 1.5,
                    uiAmountString: '1.5',
                },
            },
        ],
        preBalances: [1_000_000_000, 0, 1_000_000_000, 1],
        preTokenBalances: [
            {
                accountIndex: 2,
                mint: TOKEN_MINT.toBase58(),
                owner: RECIPIENT.toBase58(),
                programId: TOKEN_ACCOUNT.toBase58(),
                uiTokenAmount: {
                    amount: '500000',
                    decimals: 6,
                    uiAmount: 0.5,
                    uiAmountString: '0.5',
                },
            },
        ],
        rewards: [],
    },
    slot: 312_456_789,
    transaction: {
        message: {
            accountKeys: [
                { pubkey: FEE_PAYER, signer: true, source: 'transaction', writable: true },
                { pubkey: RECIPIENT, signer: false, source: 'transaction', writable: true },
                { pubkey: TOKEN_ACCOUNT, signer: false, source: 'transaction', writable: true },
                {
                    pubkey: new PublicKey(SystemProgram.programId),
                    signer: false,
                    source: 'transaction',
                    writable: false,
                },
            ],
            addressTableLookups: [],
            instructions: [
                {
                    parsed: {
                        info: {
                            destination: RECIPIENT.toBase58(),
                            lamports: 1_000_000_000,
                            source: FEE_PAYER.toBase58(),
                        },
                        type: 'transfer',
                    },
                    program: 'system',
                    programId: new PublicKey(SystemProgram.programId),
                    stackHeight: null,
                },
            ],
            recentBlockhash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
        },
        signatures: [DEFAULT_SIGNATURE],
    },
    version: 'legacy',
} as unknown as ParsedTransactionWithMeta;

export const MOCK_PARSED_TX = mockParsedTransactionDetails({ transactionWithMeta: BASE_TX });

export const MOCK_PARSED_TX_NO_BLOCK_TIME = mockParsedTransactionDetails({
    transactionWithMeta: { ...BASE_TX, blockTime: null },
});

export const MOCK_FAILED_TX = mockParsedTransactionDetails({
    transactionWithMeta: {
        ...BASE_TX,
        meta: {
            ...BASE_TX.meta,
            err: { InstructionError: [0, 'GenericError'] },
            logMessages: [
                'Program 11111111111111111111111111111111 invoke [1]',
                'Program log: insufficient funds',
                'Program 11111111111111111111111111111111 failed: custom program error: 0x1',
            ],
        } as unknown as ParsedTransactionWithMeta['meta'],
    },
});

// Built from real wire bytes rather than hand-picked numbers, so the size and the compute unit limit the
// summary renders are the ones these bytes actually carry.
function createRawTransaction(bytes: Uint8Array): RawTransaction {
    const messageBytes = parseTransactionBytes(bytes).messageBytes;
    const message = VersionedMessage.deserialize(messageBytes);

    return {
        message,
        messageBytes,
        parsedTransaction: fromRpcTransaction({ transaction: [toBase64(bytes), 'base64'], version: 'legacy' }),
        serializedSize: bytes.length,
        signatures: [DEFAULT_SIGNATURE],
        slot: 372_654_321,
        transaction: TransactionMessage.decompile(message),
        version: 'legacy',
    };
}

const RAW_TX = createRawTransaction(createWeb3TransactionBytes('legacy'));

export const MOCK_RAW_TX = mockRawTransactionDetails({ raw: { ...RAW_TX, blockTime: 1_716_000_000 } });

export const MOCK_RAW_TX_NO_BLOCK_TIME = mockRawTransactionDetails({ raw: RAW_TX });

/** Accurately budgeted: requests 1,000 compute units for a transfer that consumes 150 of them. */
export const MOCK_RAW_TIGHT_BUDGET_TX = mockRawTransactionDetails({
    raw: createRawTransaction(createWeb3TransactionBytes('legacy', { computeUnitLimit: 1_000 })),
});

/**
 * A wallet's default 200,000 compute unit request left in place over a transfer that uses 150. The
 * executed cost the RPC reports is unchanged — only the *requested* cost, which SIMD-0553 charges
 * on, blows up.
 */
export const MOCK_RAW_LOOSE_BUDGET_TX = mockRawTransactionDetails({
    raw: createRawTransaction(createWeb3TransactionBytes('legacy', { computeUnitLimit: 200_000 })),
});

export const MOCK_NO_LOGS_TX = mockParsedTransactionDetails({
    transactionWithMeta: {
        ...BASE_TX,
        meta: { ...BASE_TX.meta, logMessages: null } as unknown as ParsedTransactionWithMeta['meta'],
    },
});
