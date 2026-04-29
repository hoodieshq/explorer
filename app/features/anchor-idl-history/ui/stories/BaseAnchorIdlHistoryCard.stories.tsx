import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import type { AnchorIdlHistoryResult } from '../../api/fetch-idl-history';
import { loadVotingAnchorFixture, VOTING_PROGRAM_ADDRESS } from '../../lib/__fixtures__';
import { BaseAnchorIdlHistoryCard } from '../BaseAnchorIdlHistoryCard';

const VOTING = loadVotingAnchorFixture();

function withOverrides(overrides: Partial<AnchorIdlHistoryResult>): AnchorIdlHistoryResult {
    return { ...VOTING, ...overrides };
}

const meta: Meta<typeof BaseAnchorIdlHistoryCard> = {
    args: {
        addressPath: '#',
        programAddress: VOTING_PROGRAM_ADDRESS,
        txPathFor: (sig: string) => `#${sig}`,
    },
    component: BaseAnchorIdlHistoryCard,
    decorators: [
        Story => (
            <div style={{ maxWidth: '100%', width: '720px' }}>
                <Story />
            </div>
        ),
    ],
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
    title: 'Features/AnchorIdlHistory/BaseAnchorIdlHistoryCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default: full captured timeline. Reconstruction (Write + SetBuffer foreign-buffer replay)
// produces the latest decoded IDL JSON in the panel above the timeline.
export const Default: Story = {
    args: {
        data: VOTING,
        error: undefined,
        isLoading: false,
    },
};

export const Truncated: Story = {
    args: {
        data: withOverrides({ totalSignatures: 1000, truncated: true }),
        error: undefined,
        isLoading: false,
    },
};

export const Loading: Story = {
    args: {
        data: undefined,
        error: undefined,
        isLoading: true,
    },
};

// Zero on-chain transactions on the IDL account.
export const Empty: Story = {
    args: {
        data: withOverrides({ snapshots: [], totalSignatures: 0 }),
        error: undefined,
        isLoading: false,
    },
};

// Transactions exist but none parsed as Anchor IDL — non-standard deployment without IDL_IX_TAG.
export const UnparsedTransactions: Story = {
    args: {
        data: withOverrides({ snapshots: [], totalSignatures: 12 }),
        error: undefined,
        isLoading: false,
    },
};

export const GenericError: Story = {
    args: {
        data: undefined,
        error: new Error('RPC request timed out'),
        isLoading: false,
    },
};
