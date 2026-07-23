import { InstructionParserProvider } from '@entities/instruction-parser';
import { ScrollAnchorProvider } from '@providers/scroll-anchor';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { mockParsedTransactionDetails, mockTransactionStatus } from '@storybook-config/__fixtures__/transactions';
import { MockAccountsProvider } from '@storybook-config/__mocks__/MockAccountsProvider';
import { MockClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { MockTokenInfoBatchProvider } from '@storybook-config/__mocks__/MockTokenInfoBatchProvider';
import { MockTransactionsProvider } from '@storybook-config/__mocks__/MockTransactionsProvider';
import React from 'react';

import { VisibilityProvider } from '@/app/shared/lib/visibility';
import { instructionParserDispatcher } from '@/app/tx/instruction-parser-dispatcher';

// Real on-chain transaction, fetched verbatim via getTransaction(jsonParsed) from mainnet-beta.
// Stored as-is in tx-real.json — nothing here is invented.
import rawTx from './tx-real.json';

export const SIGNATURE: string = rawTx.transaction.signatures[0];

// The RPC response encodes public keys as base58 strings, but web3.js's
// ParsedTransactionWithMeta shape (which the UI consumes) uses PublicKey instances for
// accountKeys[].pubkey and every instruction's programId / accounts. Hydrate those in place;
// everything else (balances, token amounts, logs, parsed.info) is kept exactly as returned.
const toPubkey = (value: string) => new PublicKey(value);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC JSON is loosely typed; we cast to the web3.js shape at the end.
function hydrateInstruction(ix: any) {
    const out = { ...ix, stackHeight: ix.stackHeight ?? null };
    if (typeof ix.programId === 'string') out.programId = toPubkey(ix.programId);
    if (Array.isArray(ix.accounts)) out.accounts = ix.accounts.map(toPubkey);
    return out;
}

const message = rawTx.transaction.message;
const transactionWithMeta = {
    ...rawTx,
    meta: {
        ...rawTx.meta,
        innerInstructions: (rawTx.meta.innerInstructions ?? []).map(group => ({
            ...group,
            instructions: group.instructions.map(hydrateInstruction),
        })),
    },
    transaction: {
        ...rawTx.transaction,
        message: {
            ...message,
            accountKeys: message.accountKeys.map(key => ({ ...key, pubkey: toPubkey(key.pubkey) })),
            addressTableLookups: message.addressTableLookups ?? [],
            instructions: message.instructions.map(hydrateInstruction),
        },
    },
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bridge RPC JSON → web3.js shape
} as unknown as ParsedTransactionWithMeta;

// Seed the parsed + status caches keyed by the real signature, matching the production
// provider shape (Record<signature, CacheEntry<T>>).
export const PARSED = { [SIGNATURE]: mockParsedTransactionDetails({ transactionWithMeta }) };
export const STATUS = {
    [SIGNATURE]: mockTransactionStatus({
        confirmationStatus: 'finalized',
        confirmations: 'max',
        err: rawTx.meta.err,
        signature: SIGNATURE,
        slot: rawTx.slot,
        timestamp: rawTx.blockTime,
    }),
};

/**
 * Full provider stack for the transaction page. Same set as the production fixture
 * (withTransactionProviders) — token-info / transactions / accounts + instruction parser —
 * but with MockClusterProvider instead of the real ClusterProvider so the page renders a
 * Connected cluster offline (the real provider's genesis-hash health check fails without a
 * live RPC and would trip the page's "RPC is not responding" guard). Wrapped in the
 * layout-level ScrollAnchor + Visibility providers the page shell relies on.
 */
export function MockTxPageProviders({ children }: { children: React.ReactNode }) {
    return (
        <ScrollAnchorProvider>
            <VisibilityProvider>
                <MockClusterProvider>
                    <MockTokenInfoBatchProvider>
                        <MockTransactionsProvider parsed={PARSED} status={STATUS}>
                            <MockAccountsProvider>
                                <InstructionParserProvider dispatcher={instructionParserDispatcher}>
                                    {children}
                                </InstructionParserProvider>
                            </MockAccountsProvider>
                        </MockTransactionsProvider>
                    </MockTokenInfoBatchProvider>
                </MockClusterProvider>
            </VisibilityProvider>
        </ScrollAnchorProvider>
    );
}
