import { ClusterStatsStatus } from '@providers/stats/solanaClusterStats';
import type { PerformanceInfo } from '@providers/stats/solanaPerformanceInfo';
import { MockClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { MockStatsProvider } from '@storybook-config/__mocks__/MockStatsProvider';
import { nextjsParameters, withStats } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';

import { NetworkStats } from '../NetworkStats';

const TPS_HISTORY = [2100, 2400, 2250, 2800, 3100, 2900, 3300, 3050, 3600, 3400, 3900, 4100, 3850, 4200];

const performanceWithHistory: PerformanceInfo = {
    avgTps: 4100,
    historyMaxTps: 4200,
    perfHistory: { long: TPS_HISTORY, medium: TPS_HISTORY, short: TPS_HISTORY },
    status: ClusterStatsStatus.Ready,
    transactionCount: 412_987_654_321n,
};

// Seeds a populated TPS history so the sparkline is visible; the supply/stake cell still reports its
// own loading state because those figures come from live RPC, not the stats provider.
const withTpsHistory: Decorator = Story => (
    <MockClusterProvider>
        <MockStatsProvider performance={performanceWithHistory}>
            <Story />
        </MockStatsProvider>
    </MockClusterProvider>
);

const meta: Meta<typeof NetworkStats> = {
    component: NetworkStats,
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Components/Home/NetworkStats',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    decorators: [withMockRpc, withStats],
};

export const WithTpsHistory: Story = {
    decorators: [withMockRpc, withTpsHistory],
};
