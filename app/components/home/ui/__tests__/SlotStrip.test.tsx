import { ClusterStatsStatus } from '@providers/stats/solanaClusterStats';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SlotStrip } from '../SlotStrip';

const mockDashboard = {
    epochInfo: {
        absoluteSlot: 312_456_789n,
        blockHeight: 295_456_321n,
        epoch: 520n,
        slotIndex: 156_789n,
        slotsInEpoch: 432_000n,
    },
    msPerSlot_1h: 420,
    status: ClusterStatsStatus.Ready,
};

vi.mock('@providers/stats/solanaClusterStats', async orig => {
    const actual = await orig<typeof import('@providers/stats/solanaClusterStats')>();
    return { ...actual, useDashboardInfo: () => mockDashboard };
});

// Reduced motion keeps the strip deterministic: the interpolation interval never starts, so the head
// stays pinned to the polled slot.
vi.mock('@/app/shared/lib/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('@utils/use-tab-visibility', () => ({ default: () => ({ visible: true }) }));
vi.mock('@utils/url', () => ({ useBuildClusterPath: () => (pathname: string) => pathname }));

describe('SlotStrip', () => {
    it('should render a window of slot tiles ending at the polled slot', () => {
        render(<SlotStrip />);
        expect(screen.getAllByRole('listitem')).toHaveLength(8);
        const head = screen.getByRole('link', { name: 'Slot 312,456,789' });
        expect(head).toHaveAttribute('href', '/block/312456789');
    });

    it('should link each tile to its block page', () => {
        render(<SlotStrip />);
        expect(screen.getByRole('link', { name: 'Slot 312,456,782' })).toHaveAttribute('href', '/block/312456782');
    });
});
