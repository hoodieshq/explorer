import { toConnectableUrl } from '@entities/cluster';
import { defaultEpochInfo, MockClusterProvider } from '@storybook-config/__mocks__/MockClusterProvider';
import { nextjsParameters } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';
import { Cluster, clusterSelection, clusterUrl } from '@utils/cluster';
import { expect, userEvent, within } from 'storybook/test';
import { SWRConfig, unstable_serialize } from 'swr';

import { FeatureGatesView } from '../FeatureGatesView';

// The mock cluster's default epoch (520) predates every mainnet activation in the feature list, which would make
// them all planned; these stories set the current epoch themselves. The slot time is seeded too, so a planned
// epoch shows its countdown without a network call.
function atEpoch(epoch: bigint): Decorator {
    return function AtEpoch(Story) {
        return (
            <MockClusterProvider
                clusterInfo={{
                    epochInfo: { ...defaultEpochInfo, epoch },
                    epochSchedule: { firstNormalEpoch: 14n, firstNormalSlot: 524_256n, slotsPerEpoch: 432_000n },
                }}
            >
                <SWRConfig value={{ fallback: { [SLOT_TIME_KEY]: 400 } }}>
                    <Story />
                </SWRConfig>
            </MockClusterProvider>
        );
    };
}

const SLOT_TIME_KEY = unstable_serialize([
    'slot-time',
    Cluster.MainnetBeta,
    toConnectableUrl(clusterUrl(clusterSelection(Cluster.MainnetBeta))),
]);

const meta: Meta<typeof FeatureGatesView> = {
    component: FeatureGatesView,
    decorators: [atEpoch(1075n)],
    parameters: nextjsParameters,
    tags: ['autodocs', 'test'],
    title: 'Features/FeatureGate/FeatureGatesView',
};

export default meta;
type Story = StoryObj<typeof meta>;

const startsWith = (title: string) => (name: string) => name.startsWith(title);

// Every activation epoch is behind the current one, so nothing is planned and that section is left out.
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByRole('heading', { level: 2, name: startsWith('Upcoming') })).toBeInTheDocument();
        expect(canvas.queryByRole('heading', { level: 2, name: startsWith('Planned') })).not.toBeInTheDocument();
        expect(canvas.getByRole('heading', { level: 2, name: startsWith('Activated') })).toBeInTheDocument();
        expect(canvas.queryByRole('tab')).not.toBeInTheDocument();
    },
};

// Epoch 1060: the features set for 1064 and later wait in Planned, above the activated ones.
export const WithPlanned: Story = {
    decorators: [atEpoch(1060n)],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const planned = canvas.queryByRole('heading', { level: 2, name: startsWith('Planned') });
        const activated = canvas.queryByRole('heading', { level: 2, name: startsWith('Activated') });
        if (!planned || !activated) throw new Error('Expected both the Planned and the Activated sections');
        expect(planned.compareDocumentPosition(activated) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        // The countdown reads at the size of the cluster label above it.
        const [label] = canvas.getAllByText(content => content.startsWith('Mainnet Beta:'));
        const [countdown] = canvas.getAllByText(content => content.startsWith('in ~'));
        expect(getComputedStyle(countdown).fontSize).toBe(getComputedStyle(label).fontSize);
    },
};

// This query matches a single activated feature: the sections with no match are left out.
export const Searching: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByRole('searchbox', { name: 'Search feature gates' }), 'MoveStake');
        expect(canvas.getByRole('link', { name: 'MoveStake and MoveLamports' })).toBeInTheDocument();
        // The found part is marked in the title.
        expect(canvas.getByText('MoveStake', { selector: 'mark' })).toBeInTheDocument();
        expect(canvas.queryByRole('heading', { level: 2, name: startsWith('Upcoming') })).not.toBeInTheDocument();
        expect(canvas.getAllByText('filtered records', { exact: false })).toHaveLength(1);
    },
};

// An epoch number finds the features activated in it, and marks it in their Activation cells.
export const SearchingEpoch: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByRole('searchbox', { name: 'Search feature gates' }), '1009');
        expect(canvas.getAllByText('1009', { selector: 'mark' }).length).toBeGreaterThan(0);
    },
};

// With no section left, one line says the search found nothing.
export const NoMatches: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByRole('searchbox', { name: 'Search feature gates' }), 'zzzz-no-such-feature');
        expect(canvas.getByText('No features match', { exact: false })).toBeInTheDocument();
        expect(canvas.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    },
};
