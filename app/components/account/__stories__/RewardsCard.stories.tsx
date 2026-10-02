import { DispatchContext as RewardsDispatch, StateContext as RewardsStateCtx } from '@providers/accounts/rewards';
import { FetchStatus } from '@providers/cache';
import { MockClusterProvider as ClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { nextjsParameters, withClusterAndAccounts } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { RewardsCard } from '../RewardsCard';

const ADDRESS = '11111111111111111111111111111111';
const noop = () => undefined;

const rewardsState = {
    entries: {
        [ADDRESS]: {
            data: {
                foundOldest: true,
                highestFetchedEpoch: 502,
                lowestFetchedEpoch: 500,
                rewards: [
                    {
                        amount: 12_500_000,
                        commission: null,
                        effectiveSlot: 312_000_000,
                        epoch: 502,
                        postBalance: 5_012_500_000,
                        rewardType: 'staking',
                    },
                    {
                        amount: 11_800_000,
                        commission: null,
                        effectiveSlot: 311_500_000,
                        epoch: 501,
                        postBalance: 5_000_000_000,
                        rewardType: 'staking',
                    },
                ],
            },
            status: FetchStatus.Fetched,
        },
    },
    url: 'https://api.mainnet-beta.solana.com',
};

const withRewards: Decorator = Story => (
    <ClusterProvider>
        <RewardsStateCtx.Provider value={rewardsState as any}>
            <RewardsDispatch.Provider value={noop as any}>
                <Story />
            </RewardsDispatch.Provider>
        </RewardsStateCtx.Provider>
    </ClusterProvider>
);

const meta = {
    argTypes: {
        layout: {
            control: 'inline-radio',
            description:
                'Inner list rendering. `table` uses the shared `<BaseTable>`; `grid` uses a CSS-grid built from `div`s (the way we render the other grid tables).',
            options: ['table', 'grid'],
        },
    },
    component: RewardsCard,
    decorators: [withClusterAndAccounts],
    parameters: {
        ...nextjsParameters,
        docs: {
            description: {
                component: [
                    "An account's staking/inflation rewards by epoch. Amounts are in SOL (lamports → SOL); the",
                    'unit is in the header and repeated per row with the `◎` glyph. `layout` picks table vs grid.',
                    '',
                    '## References',
                    '',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the card surface plus the "Rewards" header and the Load-More footer.',
                    '- [BaseTable](?path=/docs/components-shared-table-basetable--docs) — the `layout="table"` list (the original dashkit table).',
                    '- Rewards grid — the `layout="grid"` list: a pure-Tailwind CSS grid (`auto auto 1fr 1fr`) built from `div`s with `role="table"`/`row`/`cell`, mirroring the Vote History / transaction Accounts tables.',
                    '- [Button](?path=/docs/components-shared-button--docs) — the "Load More" button in the footer.',
                    '- `Epoch` / `Slot` — render the Epoch and Effective Slot cells as linked values.',
                    '- [LoadingCard](?path=/docs/components-common-loadingcard--docs) / [ErrorCard](?path=/docs/components-common-errorcard--docs) — the loading and fetch-error states.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Account/RewardsCard',
} satisfies Meta<typeof RewardsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRewardsList: Story = {
    args: { address: ADDRESS },
    decorators: [withRewards],
};

// `layout="grid"` renders the same rewards as a CSS grid instead of a `<table>`.
export const GridLayout: Story = {
    args: { address: ADDRESS, layout: 'grid' },
    decorators: [withRewards],
};
