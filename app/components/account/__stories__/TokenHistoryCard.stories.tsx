import type { AccountHistory } from '@features/transaction-history';
import {
    DispatchContext as TokensDispatch,
    type State as TokensState,
    StateContext as TokensStateCtx,
    type TokenInfoWithPubkey,
} from '@providers/accounts/tokens';
import { type CacheEntry, FetchStatus } from '@providers/cache';
import {
    DispatchContext as ParsedDetailsDispatch,
    StateContext as ParsedDetailsStateCtx,
} from '@providers/transactions/parsed';
import { ConfirmedSignatureInfo, PublicKey } from '@solana/web3.js';
import { MockAccountsProvider } from '@storybook-config/__mocks__/MockAccountsProvider';
import { MockClusterProvider as ClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { MockHistoryProvider } from '@storybook-config/__mocks__/MockHistoryProvider';
import { createNextjsParameters, nextjsParameters, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { TokenHistoryCard } from '../TokenHistoryCard';

const ADDRESS = PublicKey.default.toBase58();
const RPC = 'https://api.mainnet-beta.solana.com';
const noop = () => undefined;

// A couple of real mints so the filter dropdown resolves recognisable labels through the token-info batch.
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
// Token-account pubkeys (any valid base58 keys — these are program ids, handy as stable distinct keys).
const TOKEN_ACC_A = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_ACC_B = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

type ParsedDetailsState = React.ContextType<typeof ParsedDetailsStateCtx>;

function token(pubkey: string, mint: string): TokenInfoWithPubkey {
    return {
        info: {
            isNative: false,
            mint: new PublicKey(mint),
            owner: PublicKey.default,
            state: 'initialized',
            tokenAmount: { amount: '0', decimals: 6, uiAmountString: '0' },
        },
        pubkey: new PublicKey(pubkey),
    };
}

function ownedTokensState(tokens: TokenInfoWithPubkey[]): TokensState {
    return { entries: { [ADDRESS]: { data: { tokens }, status: FetchStatus.Fetched } }, url: RPC };
}

// Signatures only need to be display strings — the Signature cell truncates and never base58-decodes.
function sig(signature: string, slot: number, failed = false): ConfirmedSignatureInfo {
    return {
        blockTime: 1_700_000_000,
        confirmationStatus: 'finalized',
        err: failed ? { InstructionError: [0, 'Custom'] } : null,
        memo: null,
        signature,
        slot,
    };
}

// `foundOldest: true` pins the oldest-slot cutoff to 0 so every seeded signature clears the slot filter.
function fetchedHistory(sigs: ConfirmedSignatureInfo[]): CacheEntry<AccountHistory> {
    return { data: { fetched: sigs, foundOldest: true }, status: FetchStatus.Fetched };
}

function pendingHistory(status: FetchStatus): CacheEntry<AccountHistory> {
    return { status };
}

const SIGS_A = [
    sig('TokenHistoryStorySignatureAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1', 250_000_030),
    sig('TokenHistoryStorySignatureAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2', 250_000_020, true),
    sig('TokenHistoryStorySignatureAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3', 250_000_010),
];
const SIGS_B = [
    sig('TokenHistoryStorySignatureBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB1', 250_000_015),
    sig('TokenHistoryStorySignatureBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB2', 250_000_005),
];

// Wires every provider TokenHistoryCard reads: cluster, accounts, owned-tokens (from `parameters.tokens`),
// seeded account-history cache (`parameters.history`), and an empty parsed-details cache.
const withCard: Decorator = (Story, ctx) => {
    const tokens: TokenInfoWithPubkey[] = ctx.parameters.tokens ?? [token(TOKEN_ACC_A, USDC)];
    const emptyParsedDetails: ParsedDetailsState = { entries: {}, url: RPC };
    return (
        <ClusterProvider>
            <MockAccountsProvider>
                <TokensStateCtx.Provider value={ownedTokensState(tokens)}>
                    <TokensDispatch.Provider value={noop}>
                        <MockHistoryProvider history={ctx.parameters.history}>
                            <ParsedDetailsStateCtx.Provider value={emptyParsedDetails}>
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
};

// The card fetches lazily (INITIAL_TOKENS_TO_FETCH = 0), so every populated state starts on the
// "Load Token History" prompt; clicking it flips the internal counter and reveals the seeded data.
async function loadHistory(canvasElement: HTMLElement) {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Load Token History' }));
    return canvas;
}

const meta = {
    component: TokenHistoryCard,
    decorators: [withCard, withTokenInfoBatch],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Account/TokenHistoryCard',
} satisfies Meta<typeof TokenHistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Token present but no history seeded → renders the initial "Load Token History" card.
export const InitialLoadPrompt: Story = {
    args: { address: ADDRESS },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            await canvas.findByText('Click the button below to load token transaction history'),
        ).toBeInTheDocument();
    },
};

// After loading, the table lists the fetched signatures with the filter dropdown in the header.
export const Populated: Story = {
    args: { address: ADDRESS },
    parameters: { history: { [TOKEN_ACC_A]: fetchedHistory(SIGS_A) } },
    play: async ({ canvasElement }) => {
        const canvas = await loadHistory(canvasElement);
        await expect(await canvas.findByText('Instruction Type')).toBeInTheDocument();
        await expect(canvas.getByText('Failed')).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'All Tokens' })).toBeInTheDocument();
    },
};

// Opening the filter dropdown reveals "All Tokens" plus one option per owned mint.
export const FilterMenuOpen: Story = {
    args: { address: ADDRESS },
    parameters: {
        history: { [TOKEN_ACC_A]: fetchedHistory(SIGS_A), [TOKEN_ACC_B]: fetchedHistory(SIGS_B) },
        tokens: [token(TOKEN_ACC_A, USDC), token(TOKEN_ACC_B, BONK)],
    },
    play: async ({ canvasElement }) => {
        const canvas = await loadHistory(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'All Tokens' }));
        // Toggle label + the menu's "All Tokens" entry both read "All Tokens".
        await expect((await canvas.findAllByText('All Tokens')).length).toBeGreaterThanOrEqual(2);
    },
};

// `?filter=<mint>` narrows the table (and header label) to a single mint.
export const FilteredByToken: Story = {
    args: { address: ADDRESS },
    parameters: {
        ...createNextjsParameters({ query: { filter: BONK } }),
        history: { [TOKEN_ACC_A]: fetchedHistory(SIGS_A), [TOKEN_ACC_B]: fetchedHistory(SIGS_B) },
        tokens: [token(TOKEN_ACC_A, USDC), token(TOKEN_ACC_B, BONK)],
    },
    play: async ({ canvasElement }) => {
        const canvas = await loadHistory(canvasElement);
        await expect(await canvas.findByText('Instruction Type')).toBeInTheDocument();
        // Filtered to BONK → the "All Tokens" default is no longer the active toggle label.
        await expect(canvas.queryByRole('button', { name: 'All Tokens' })).not.toBeInTheDocument();
    },
};

// History still fetching → the loading card.
export const Loading: Story = {
    args: { address: ADDRESS },
    parameters: { history: { [TOKEN_ACC_A]: pendingHistory(FetchStatus.Fetching) } },
    play: async ({ canvasElement }) => {
        const canvas = await loadHistory(canvasElement);
        await expect(await canvas.findByText('Loading history')).toBeInTheDocument();
    },
};

// History fetch failed → the retryable error card.
export const FetchFailed: Story = {
    args: { address: ADDRESS },
    parameters: { history: { [TOKEN_ACC_A]: pendingHistory(FetchStatus.FetchFailed) } },
    play: async ({ canvasElement }) => {
        const canvas = await loadHistory(canvasElement);
        await expect(await canvas.findByText('Failed to fetch transaction history')).toBeInTheDocument();
    },
};

// Fetched but empty → the "no history" error card.
export const NoHistoryFound: Story = {
    args: { address: ADDRESS },
    parameters: { history: { [TOKEN_ACC_A]: fetchedHistory([]) } },
    play: async ({ canvasElement }) => {
        const canvas = await loadHistory(canvasElement);
        await expect(await canvas.findByText('No transaction history found')).toBeInTheDocument();
    },
};

// More than 25 token accounts → the card short-circuits to an error before any history is fetched.
export const TooManyTokens: Story = {
    args: { address: ADDRESS },
    parameters: {
        tokens: Array.from({ length: 26 }, (_, i) =>
            token(new PublicKey(new Uint8Array(32).fill(i + 1)).toBase58(), USDC),
        ),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            await canvas.findByText(
                'Token transaction history is not available for accounts with over 25 token accounts',
            ),
        ).toBeInTheDocument();
    },
};

// A few history rows seeded straight into the mock provider (keyed by the default token account), so
// clicking "Load Token History" renders the populated grid with no RPC. Real base58 signatures; one row
// carries an `err` to exercise the "Failed" badge next to the "Success" rows.
const populatedHistory: Record<string, CacheEntry<AccountHistory>> = {
    [TOKEN_ACC_A]: {
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

// Populated grid. The card starts at 0 tokens-to-fetch, so `play` clicks "Load Token History"; the
// seeded rows then render from the mock provider (no RPC). Columns: Signature (+ status badge),
// Instruction Type, Token, Slot. Instruction Type shows the per-row "Load" affordance since no parsed
// details are seeded.
export const PopulatedGrid: Story = {
    args: { address: ADDRESS, layout: 'grid' },
    parameters: { history: populatedHistory },
    play: async ({ canvasElement }) => {
        const canvas = await loadHistory(canvasElement);
        // The card renders both the mobile list and the desktop grid at once (CSS toggles visibility), so
        // the failed row's "Failed" badge exists twice in the DOM. Scope the assertion to the desktop grid
        // (the only node with role="table") to match a single element.
        const grid = await canvas.findByRole('table', { name: 'Token history' });
        await expect(await within(grid).findByText('Failed')).toBeInTheDocument();
    },
};
