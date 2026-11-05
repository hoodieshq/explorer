import { gen } from '@__fixtures__/gen';
import { address } from '@solana/kit';
import type { Meta, StoryObj } from '@storybook-config/types';
import { Cluster } from '@utils/cluster';
import { expect, fn, within } from 'storybook/test';

import type { ActivatedFeature, UpcomingFeature } from '../../lib/partition-features';
import { FeatureGateList, StatusLine, UpcomingStatus } from '../FeatureGateList';
import { EmptyStateCard, ShowMoreButton } from '../FeatureGateTable';

// REVIEW(HOO-926): stories of the feed variant; remove with it.

const baseFields = {
    comms_required: null,
    devnet_activation_epoch: 1044,
    mainnet_activation_epoch: 971,
    min_agave_versions: [],
    min_fd_versions: [],
    min_jito_versions: [],
    owners: [],
    planned_testnet_order: null,
    testnet_activation_epoch: 930,
};

const activated: ActivatedFeature[] = [
    {
        ...baseFields,
        clusterActivationEpoch: 971,
        description:
            'Replaces the Token program with p-token, a compute-efficient implementation that keeps the same instructions and accounts.',
        key: address(gen.address(1)),
        otherActivations: [],
        simdEntries: [
            {
                link: 'https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0266-efficient-token-program.md',
                simd: '0266',
            },
        ],
        title: 'SIMD-0266: Efficient Token program',
    },
    {
        ...baseFields,
        clusterActivationEpoch: 1080,
        description: 'Lowers the rent per byte in steps; this is the second.',
        key: address(gen.address(2)),
        otherActivations: [],
        simdEntries: [
            {
                link: 'https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0437-incremental-rent-reduction.md',
                simd: '0437',
            },
        ],
        title: 'SIMD-0437-2: Set lamports per byte to 5080',
    },
    {
        ...baseFields,
        clusterActivationEpoch: 727,
        description: null,
        key: address(gen.address(3)),
        otherActivations: [],
        simdEntries: [],
        title: 'Feature without description or SIMDs',
    },
];

const upcoming: UpcomingFeature[] = [
    {
        ...baseFields,
        description: 'Raises the block limit to 100M compute units.',
        key: address(gen.address(4)),
        otherActivations: [
            { cluster: Cluster.Devnet, epoch: 1100 },
            { cluster: Cluster.Testnet, epoch: 983 },
        ],
        simdEntries: [],
        title: 'Raise Block Limits to 100M CU',
    },
];

const meta: Meta<typeof FeatureGateList<ActivatedFeature>> = {
    component: FeatureGateList<ActivatedFeature>,
    tags: ['autodocs', 'test'],
    title: 'Features/FeatureGate/FeatureGateList',
};

export default meta;
type Story = StoryObj<typeof FeatureGateList<ActivatedFeature>>;

// The second record's epoch is still ahead, so it reads as scheduled.
export const Activated: Story = {
    args: {
        cluster: Cluster.MainnetBeta,
        emptyState: <EmptyStateCard>No activated features.</EmptyStateCard>,
        features: activated,
        status: feature =>
            feature.clusterActivationEpoch > 1000 ? (
                <StatusLine tone="scheduled">
                    Scheduled for epoch {feature.clusterActivationEpoch} · in ~4d 3h 12m
                </StatusLine>
            ) : (
                <StatusLine tone="active">Active since epoch {feature.clusterActivationEpoch}</StatusLine>
            ),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('link', { name: 'Efficient Token program' })).toBeInTheDocument();
        await expect(canvas.getByText('Replaces the Token program', { exact: false })).toBeVisible();
    },
};

export const Upcoming: StoryObj<typeof FeatureGateList<UpcomingFeature>> = {
    args: {
        cluster: Cluster.MainnetBeta,
        emptyState: <EmptyStateCard>No upcoming features.</EmptyStateCard>,
        features: upcoming,
        footer: <ShowMoreButton hiddenCount={8} onClick={fn()} />,
        status: feature => <UpcomingStatus activations={feature.otherActivations} />,
    },
};
