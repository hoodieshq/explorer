import { gen } from '@__fixtures__/gen';
import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';
import { vi } from 'vitest';

import { FeatureAccountSection } from '@/app/components/account/FeatureAccountSection';
import { FEATURE_GATES } from '@/app/entities/feature-gate';
import type { Account } from '@/app/providers/accounts';
import { Cluster, clusterSlug } from '@/app/utils/cluster';
import { FEATURE_PROGRAM_ID } from '@/app/utils/parseFeatureAccount';

vi.mock('next/navigation', () => ({
    useSearchParams: vi.fn(),
}));

vi.mock('@/app/providers/cluster', () => ({
    useCluster: vi.fn(() => ({ cluster: Cluster.Devnet })),
    useClusterInfo: vi.fn(() => CLUSTER_INFO),
}));

vi.mock('@entities/slot-time', () => ({
    useSlotTime: vi.fn(() => undefined),
}));

vi.mock('@features/account', () => ({
    AccountCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@components/common/Address', () => ({
    Address: () => null,
}));

describe('FeatureAccountSection', () => {
    beforeEach(() => {
        vi.mocked(useSearchParams).mockReturnValue(
            new URLSearchParams({ cluster: clusterSlug(Cluster.Devnet) }) as ReturnType<typeof useSearchParams>,
        );
    });

    it('should write the activation epoch as the feature-gate lists do, linked by the cluster slug', () => {
        render(<FeatureAccountSection account={featureAccount({ activated: true })} />);

        expect(screen.getByText('Devnet:', { exact: false })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('href', '/epoch/3?cluster=devnet');
    });

    it('should name the cluster by slug in the pending activation epoch link', () => {
        render(<FeatureAccountSection account={featureAccount({ activated: false })} />);

        expect(screen.getByRole('link', { name: '4' })).toHaveAttribute('href', '/epoch/4?cluster=devnet');
    });

    it('should list the feature before its status, with the status as a tx-style Active badge', () => {
        const gate = FEATURE_GATES.find(({ description, simds }) => description && simds.length > 0);
        if (!gate) throw new Error('feature-gates.json has no feature with a description and SIMDs');
        render(
            <FeatureAccountSection account={featureAccount({ activated: true, pubkey: new PublicKey(gate.key) })} />,
        );

        const labels = [
            'Address',
            'Title',
            'Description',
            'SIMDs',
            'Status',
            'Activated At Slot',
            'Cluster Activation',
        ];
        const positions = labels.map(label => document.body.textContent?.indexOf(label) ?? -1);
        expect(positions.every(position => position >= 0)).toBe(true);
        expect([...positions].sort((a, b) => a - b)).toEqual(positions);
        expect(screen.getByText(gate.title)).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show a feature not activated yet as a chip, with a dash for its activation epoch', () => {
        const gate = FEATURE_GATES[0];
        // An account the feature program doesn't own reads as a known feature that hasn't been activated.
        render(
            <FeatureAccountSection
                account={{
                    ...featureAccount({ activated: false, pubkey: new PublicKey(gate.key) }),
                    owner: PublicKey.default,
                }}
            />,
        );

        expect(screen.getByText('Not active yet')).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
    });
});

function featureAccount({ activated, pubkey = FEATURE_ADDRESS }: { activated: boolean; pubkey?: PublicKey }): Account {
    const raw = new Uint8Array(9);
    if (activated) {
        raw[0] = ACTIVATED_TAG;
        new DataView(raw.buffer).setBigUint64(1, ACTIVATION_SLOT, true);
    }

    return {
        data: { raw },
        executable: false,
        lamports: 1_000_000_000,
        owner: new PublicKey(FEATURE_PROGRAM_ID),
        pubkey,
        space: raw.length,
    };
}

/** Tag byte the parser reads as "activated, activation slot follows". */
const ACTIVATED_TAG = 1;

// Slot 400 with 128 slots per epoch lands in epoch 3, and the pending case links the epoch after
// the current one, so the two cases assert 3 and 4.
const ACTIVATION_SLOT = 400n;

const CLUSTER_INFO = {
    epochInfo: {
        absoluteSlot: 500n,
        blockHeight: 500n,
        epoch: 3n,
        slotIndex: 20n,
        slotsInEpoch: 128n,
    },
    epochSchedule: {
        firstNormalEpoch: 0n,
        firstNormalSlot: 0n,
        slotsPerEpoch: 128n,
    },
    firstAvailableBlock: 0n,
};

// Seeded, so a failure prints the same address every run.
const FEATURE_ADDRESS = gen.publicKey(1);
