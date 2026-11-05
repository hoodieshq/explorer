import { address } from '@solana/kit';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Cluster } from '@/app/utils/cluster';

import type { ActivatedFeature } from '../../lib/partition-features';
import { FeatureGateList, SortToggle, StatusLine, UpcomingStatus } from '../FeatureGateList';
import { EmptyStateCard } from '../FeatureGateTable';

vi.mock('next/navigation', () => ({
    useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const FEATURE: ActivatedFeature = {
    clusterActivationEpoch: 971,
    comms_required: null,
    description: 'Replaces the Token program with a compute-efficient implementation',
    devnet_activation_epoch: 1044,
    key: address('ptokFjwyJtrwCa9Kgo9xoDS59V4QccBGEaRFnRPnSdP'),
    mainnet_activation_epoch: 971,
    min_agave_versions: [],
    min_fd_versions: [],
    min_jito_versions: [],
    otherActivations: [],
    owners: [],
    planned_testnet_order: null,
    simdEntries: [{ link: 'https://github.com/solana-foundation/solana-improvement-documents/pull/266', simd: '0266' }],
    testnet_activation_epoch: 930,
    title: 'SIMD-0266: Efficient Token program',
};

const renderList = (props: Partial<Parameters<typeof FeatureGateList<ActivatedFeature>>[0]> = {}) =>
    render(
        <FeatureGateList<ActivatedFeature>
            features={[FEATURE]}
            cluster={Cluster.MainnetBeta}
            status={feature => (
                <StatusLine tone="active">Active since epoch {feature.clusterActivationEpoch}</StatusLine>
            )}
            emptyState={<EmptyStateCard>Nothing here.</EmptyStateCard>}
            {...props}
        />,
    );

describe('FeatureGateList', () => {
    it('should show the SIMD as a badge and drop it from the title', () => {
        renderList();

        expect(screen.getByRole('link', { name: 'SIMD 0266' })).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 3, name: 'SIMD 0266 Efficient Token program' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Efficient Token program' })).toHaveAttribute(
            'href',
            `/address/${FEATURE.key}/feature-gate?cluster=mainnet-beta`,
        );
    });

    it('should keep the SIMD lead of a title that has no SIMD badges', () => {
        renderList({ features: [{ ...FEATURE, simdEntries: [] }] });

        expect(screen.getByRole('link', { name: 'SIMD-0266: Efficient Token program' })).toBeInTheDocument();
    });

    it('should show the description, the status line and the shortened key without a click', () => {
        renderList();

        expect(screen.getByText(FEATURE.description as string)).toBeInTheDocument();
        expect(screen.getByText('Active since epoch 971')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: `Open address ${FEATURE.key}` })).toHaveTextContent('ptok…nSdP');
        expect(screen.queryByRole('button', { name: 'Show details' })).not.toBeInTheDocument();
    });

    it('should list the other clusters in the upcoming status', () => {
        render(
            <UpcomingStatus
                activations={[
                    { cluster: Cluster.Devnet, epoch: 1044 },
                    { cluster: Cluster.Testnet, epoch: 930 },
                ]}
            />,
        );

        expect(screen.getByText('Not active yet', { exact: false })).toHaveTextContent(
            'Not active yet · Devnet 1044 · Testnet 930',
        );
        expect(screen.getByRole('link', { name: '1044' })).toHaveAttribute('href', '/epoch/1044?cluster=devnet');
    });

    it('should name the order the sort toggle keeps', () => {
        const onToggle = vi.fn();
        render(<SortToggle label="Activation" direction="asc" onToggle={onToggle} />);

        fireEvent.click(screen.getByRole('button', { name: 'Activation: oldest first' }));
        expect(onToggle).toHaveBeenCalledOnce();
    });

    it('should render the empty state instead of the list when there are no features', () => {
        renderList({ features: [] });

        expect(screen.queryByRole('list')).not.toBeInTheDocument();
        expect(screen.getByText('Nothing here.')).toBeInTheDocument();
    });
});
