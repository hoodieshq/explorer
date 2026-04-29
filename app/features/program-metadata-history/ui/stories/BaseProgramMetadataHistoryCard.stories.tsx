import { address } from '@solana/kit';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import type { MetadataHistoryResult } from '../../api/fetch-metadata-history';
import { MetadataAccountNotFoundError } from '../../api/fetch-metadata-history';
import { loadVotingPmpFixture } from '../../lib/__fixtures__';
import { BaseProgramMetadataHistoryCard } from '../BaseProgramMetadataHistoryCard';

const VOTING = loadVotingPmpFixture();
const VOTING_PROGRAM = address('AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye');

function withOverrides(overrides: Partial<MetadataHistoryResult>): MetadataHistoryResult {
    return { ...VOTING, ...overrides };
}

const meta: Meta<typeof BaseProgramMetadataHistoryCard> = {
    args: {
        addressPath: '#',
        onSeedChange: () => {},
        // Real program from devnet — the fixture was captured for this exact address/seed.
        programAddress: VOTING_PROGRAM,
        seed: 'idl',
        txPathFor: (sig: string) => `#${sig}`,
    },
    component: BaseProgramMetadataHistoryCard,
    decorators: [
        Story => (
            <div style={{ maxWidth: '100%', width: '720px' }}>
                <Story />
            </div>
        ),
    ],
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
    title: 'Features/ProgramMetadataHistory/BaseProgramMetadataHistoryCard',
};

export default meta;
type Story = StoryObj<typeof meta>;

// The captured fixture ends with a Trim+Close pair, so the top panel exercises the
// "fall back to last decoded content" path (current state.content is undefined; we walk
// backwards to the most recent Initialize/SetData).
export const Default: Story = {
    args: {
        data: VOTING,
        error: undefined,
        isLoading: false,
    },
};

// Truncate to the first Initialize so the latest snapshot is still Active — exercises the
// active-state branch of `RowDetails` and the live state header.
export const ActiveOnly: Story = {
    args: {
        data: withOverrides({
            snapshots: VOTING.snapshots.slice(0, 1),
            totalSignatures: 1,
        }),
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

export const Empty: Story = {
    args: {
        data: withOverrides({ snapshots: [], totalSignatures: 0 }),
        error: undefined,
        isLoading: false,
    },
};

export const AccountNotFound: Story = {
    args: {
        data: undefined,
        error: new MetadataAccountNotFoundError('Program account not found', {
            programAddress: VOTING.pdaAddress,
            seed: 'idl',
        }),
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
