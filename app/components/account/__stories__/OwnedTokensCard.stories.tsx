import { gen } from '@__fixtures__/gen';
import {
    DispatchContext as TokensDispatch,
    type State as TokensState,
    StateContext as TokensStateCtx,
} from '@providers/accounts/tokens';
import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { MockAccountsProvider } from '@storybook-config/__mocks__/MockAccountsProvider';
import { MockClusterProvider as ClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { MockTokenInfoBatchProvider } from '@storybook-config/__mocks__/MockTokenInfoBatchProvider';
import { nextjsParameters, withTokenInfoBatch } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { OwnedTokensCard } from '../OwnedTokensCard';

const ADDRESS = '11111111111111111111111111111111';
const noop = () => undefined;

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const logoInfos = {
    [USDC_MINT]: {
        address: USDC_MINT,
        logoURI:
            'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        name: 'USD Coin',
        symbol: 'USDC',
    },
    // No entry for WSOL_MINT on purpose - exercises the fallback-logo branch alongside the seeded row.
} as const;

// Batch labels for the Summary/Detailed comparison fixture below. USDC and BONK are seeded; WSOL is left out
// on purpose so one row still exercises the fallback logo.
const mixedLogoInfos = {
    [BONK_MINT]: {
        address: BONK_MINT,
        logoURI:
            'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
        name: 'Bonk',
        symbol: 'BONK',
    },
    [USDC_MINT]: {
        address: USDC_MINT,
        logoURI:
            'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        name: 'USD Coin',
        symbol: 'USDC',
    },
} as const;

const tokensState = (entries: TokensState['entries']): TokensState => ({
    entries,
    url: 'https://api.mainnet-beta.solana.com',
});

const sampleTokensEntry = {
    data: {
        tokens: [
            {
                info: {
                    isNative: false,
                    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '1234560000', decimals: 6, uiAmount: 1234.56, uiAmountString: '1234.56' },
                },
                pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            },
        ],
    },
    status: FetchStatus.Fetched,
};

const sampleTokensWithLogosEntry = {
    data: {
        tokens: [
            {
                info: {
                    isNative: false,
                    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '1234560000', decimals: 6, uiAmount: 1234.56, uiAmountString: '1234.56' },
                },
                pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            },
            {
                info: {
                    isNative: false,
                    mint: new PublicKey(WSOL_MINT),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '5000000000', decimals: 9, uiAmount: 5, uiAmountString: '5' },
                },
                // No seeded logo for this mint exercises the fallback-logo branch alongside the seeded USDC row.
                pubkey: gen.publicKey(2),
            },
        ],
    },
    status: FetchStatus.Fetched,
};

// A wallet chosen to make the Summary vs Detailed difference obvious:
// - USDC is held in TWO token accounts (1000 + 234.56). Both displays group by mint and SUM, so USDC shows
//   as a single 1234.56 row — which is why Detailed labels the column "Total Balance". Because rows collapse
//   by mint, Detailed's Account Address column surfaces one account for that mint (the last one seen).
// - WSOL and BONK sit in one account each, so the Detailed Account Address column reads clearly across rows.
const sampleMixedEntry = {
    data: {
        tokens: [
            {
                info: {
                    isNative: false,
                    mint: new PublicKey(USDC_MINT),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '1000000000', decimals: 6, uiAmount: 1000, uiAmountString: '1000' },
                },
                pubkey: gen.publicKey(1),
            },
            {
                info: {
                    isNative: false,
                    mint: new PublicKey(USDC_MINT),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '234560000', decimals: 6, uiAmount: 234.56, uiAmountString: '234.56' },
                },
                pubkey: gen.publicKey(2),
            },
            {
                info: {
                    isNative: false,
                    mint: new PublicKey(WSOL_MINT),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '5000000000', decimals: 9, uiAmount: 5, uiAmountString: '5' },
                },
                pubkey: gen.publicKey(3),
            },
            {
                info: {
                    isNative: false,
                    mint: new PublicKey(BONK_MINT),
                    owner: new PublicKey(ADDRESS),
                    state: 'initialized' as const,
                    tokenAmount: { amount: '42000000000', decimals: 5, uiAmount: 420000, uiAmountString: '420000' },
                },
                pubkey: gen.publicKey(4),
            },
        ],
    },
    status: FetchStatus.Fetched,
};

function MockTokensState({ children, value }: { children: React.ReactNode; value: TokensState }) {
    return (
        <ClusterProvider>
            <MockAccountsProvider>
                <TokensStateCtx.Provider value={value}>
                    <TokensDispatch.Provider value={noop as any}>{children}</TokensDispatch.Provider>
                </TokensStateCtx.Provider>
            </MockAccountsProvider>
        </ClusterProvider>
    );
}

const withTokens: Decorator = Story => (
    <MockTokensState value={tokensState({ [ADDRESS]: sampleTokensEntry as any })}>
        <Story />
    </MockTokensState>
);

const withTokensAndLogos: Decorator = Story => (
    <MockTokensState value={tokensState({ [ADDRESS]: sampleTokensWithLogosEntry as any })}>
        <Story />
    </MockTokensState>
);

const withNoTokens: Decorator = Story => (
    <MockTokensState
        value={tokensState({
            [ADDRESS]: { data: { tokens: [] }, status: FetchStatus.Fetched },
        })}
    >
        <Story />
    </MockTokensState>
);

const withMixedTokens: Decorator = Story => (
    <MockTokenInfoBatchProvider infos={mixedLogoInfos}>
        <MockTokensState value={tokensState({ [ADDRESS]: sampleMixedEntry as any })}>
            <Story />
        </MockTokensState>
    </MockTokenInfoBatchProvider>
);

const meta = {
    argTypes: {
        layout: {
            control: 'inline-radio',
            options: ['table', 'grid'],
        },
    },
    // Grid is the new responsive layout, so every story previews it by default; flip to `table` (the legacy
    // dashkit table, still the component default in production) via the Layout control.
    args: { layout: 'grid' },
    component: OwnedTokensCard,
    decorators: [withTokenInfoBatch],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Account/OwnedTokensCard',
} satisfies Meta<typeof OwnedTokensCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHoldings: Story = {
    args: { address: ADDRESS },
    decorators: [withTokens],
};

export const WithLogos: Story = {
    args: { address: ADDRESS },
    decorators: [
        Story => (
            <MockTokenInfoBatchProvider infos={logoInfos}>
                <Story />
            </MockTokenInfoBatchProvider>
        ),
        withTokensAndLogos,
    ],
};

export const Empty: Story = {
    args: { address: ADDRESS },
    decorators: [withNoTokens],
};

// Demonstrative fixture: USDC held across two token accounts (summed into one 1234.56 row), plus WSOL and
// BONK — so the always-detailed grid's Account Address column reads across several rows.
export const MixedHoldings: Story = {
    args: { address: ADDRESS },
    decorators: [withMixedTokens],
};
