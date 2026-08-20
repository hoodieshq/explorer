import type { AccountHistory } from '@features/transaction-history/lib/types';
import {
    DispatchContext as TokensDispatch,
    type State as TokensState,
    StateContext as TokensStateCtx,
} from '@providers/accounts/tokens';
import { CacheEntry, FetchStatus } from '@providers/cache';
import {
    DispatchContext as ParsedDetailsDispatch,
    StateContext as ParsedDetailsStateCtx,
} from '@providers/transactions/parsed';
import { PublicKey } from '@solana/web3.js';
import { MockAccountsProvider } from '@storybook-config/__mocks__/MockAccountsProvider';
import { MockClusterProvider as ClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { MockHistoryProvider } from '@storybook-config/__mocks__/MockHistoryProvider';
import { nextjsParameters, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { TokenHistoryCard } from '../TokenHistoryCard';

const ADDRESS = PublicKey.default.toBase58();
const MAINNET_RPC_URL = 'https://api.mainnet-beta.solana.com';
const noop = () => undefined;

type ParsedDetailsState = React.ContextType<typeof ParsedDetailsStateCtx>;

// Single owned token; history will start empty so the card renders the empty/no-history state.
const tokensStateValue: TokensState = {
    entries: {
        [ADDRESS]: {
            data: {
                tokens: [
                    {
                        info: {
                            isNative: false,
                            mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                            owner: PublicKey.default,
                            state: 'initialized',
                            tokenAmount: { amount: '0', decimals: 6, uiAmountString: '0' },
                        },
                        pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
                    },
                ],
            },
            status: FetchStatus.Fetched,
        },
    },
    url: MAINNET_RPC_URL,
};

const emptyParsedDetailsState: ParsedDetailsState = { entries: {}, url: MAINNET_RPC_URL };

const withToken: Decorator = Story => (
    <ClusterProvider>
        <MockAccountsProvider>
            <TokensStateCtx.Provider value={tokensStateValue}>
                <TokensDispatch.Provider value={noop}>
                    <MockHistoryProvider>
                        <ParsedDetailsStateCtx.Provider value={emptyParsedDetailsState}>
                            <ParsedDetailsDispatch.Provider value={noop}>
                                <Story />
                            </ParsedDetailsDispatch.Provider>
                        </ParsedDetailsStateCtx.Provider>
                    </MockHistoryProvider>
                </TokensDispatch.Provider>
            </TokensStateCtx.Provider>
        </MockAccountsProvider>
    </ClusterProvider>
);

const meta = {
    component: TokenHistoryCard,
    decorators: [withTokenInfoBatch],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Account/TokenHistoryCard',
} satisfies Meta<typeof TokenHistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Token present but no history seeded → renders the initial "Load Token History" card.
export const InitialLoadPrompt: Story = {
    args: { address: ADDRESS },
    decorators: [withToken],
};

// A few history rows seeded straight into the mock provider (keyed by the token-account pubkey), so
// clicking "Load Token History" renders the populated table with no RPC. Real base58 signatures; one row
// carries an `err` to exercise the "Failed" badge next to the "Success" rows.
const TOKEN_ACCOUNT = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

const populatedHistory: Record<string, CacheEntry<AccountHistory>> = {
    [TOKEN_ACCOUNT]: {
        data: {
            fetched: [
                {
                    blockTime: 1_763_638_534,
                    confirmationStatus: 'finalized',
                    err: null,
                    memo: null,
                    signature:
                        '4wRiBhEzHHi1o1j5ZyfzDdxGEEHqfzqtKndDT12y5G3drKz7syihe8vxK6q1CC46r4oP1UjyVMZmnAmqxb9A4GgL',
                    slot: 381_319_118,
                },
                {
                    blockTime: 1_763_600_000,
                    confirmationStatus: 'finalized',
                    err: null,
                    memo: null,
                    signature:
                        '5t6d1od6QxAMhoWAXK5isnp3HyRqoFKWLX4Saq18WjjsB3Ry7g5bgMujgyS5wakin7DSppSnZA9VsD9HY6Ddwao3',
                    slot: 381_300_000,
                },
                {
                    blockTime: 1_763_500_000,
                    confirmationStatus: 'finalized',
                    err: { InstructionError: [0, { Custom: 1 }] },
                    memo: null,
                    signature:
                        '3Zt9oAaq4BEpV3F27CDRGBoYWqka13afosCmBGqMtvFcx56GtVgZzfLkFydxiDwW14vEL5nHoqrrTy5fbfc1YVuQ',
                    slot: 381_200_000,
                },
            ],
            foundOldest: true,
        },
        status: FetchStatus.Fetched,
    },
};

const withPopulatedHistory: Decorator = Story => (
    <ClusterProvider>
        <MockAccountsProvider>
            <TokensStateCtx.Provider value={tokensStateValue}>
                <TokensDispatch.Provider value={noop}>
                    <MockHistoryProvider history={populatedHistory}>
                        <ParsedDetailsStateCtx.Provider value={emptyParsedDetailsState}>
                            <ParsedDetailsDispatch.Provider value={noop}>
                                <Story />
                            </ParsedDetailsDispatch.Provider>
                        </ParsedDetailsStateCtx.Provider>
                    </MockHistoryProvider>
                </TokensDispatch.Provider>
            </TokensStateCtx.Provider>
        </MockAccountsProvider>
    </ClusterProvider>
);

// Populated grid. The card starts at 0 tokens-to-fetch, so `play` clicks "Load Token History"; the
// seeded rows then render from the mock provider (no RPC). Columns: Signature (+ status badge),
// Instruction Type, Token, Slot. Instruction Type shows the per-row "Load" affordance since no parsed
// details are seeded.
export const Populated: Story = {
    args: { address: ADDRESS, layout: 'grid' },
    decorators: [withPopulatedHistory],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Load Token History' }));
        await expect(await canvas.findByText('Failed')).toBeInTheDocument();
    },
};
