import { withClusterAccountsAndTokenInfo } from '@storybook-config/decorators';
import type { Decorator, Meta, StoryObj } from '@storybook-config/types';
import { useEffect } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import {
    installSimulatedRpc,
    simulatedMessage,
} from '../../vendor/features/instruction-simulation/mocks/simulated-rpc';
import { SimulatorCard } from '../../vendor/features/instruction-simulation/ui/SimulationCard';
import {
    DEFAULT_HANDLERS,
    MOCK_ACCOUNT_BALANCES,
    MOCK_MESSAGE,
    nextjsParameters,
    withInspectorProviders,
} from './mocks';

// Replay the captured mainnet simulation by stubbing Connection's RPC methods for the story's
// lifetime. useSimulation only calls them after the Simulate click (in `play`), so patching in an
// effect on mount lands well before the network would be touched.
const withSimulatedRpc: Decorator = Story => {
    useEffect(() => installSimulatedRpc(), []);
    return <Story />;
};

const meta = {
    component: SimulatorCard,
    decorators: [withInspectorProviders],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/SimulatorCard',
} satisfies Meta<typeof SimulatorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Idle state: the informational card with a "Simulate" button (no RPC until clicked).
export const Default: Story = {
    args: { accountBalances: MOCK_ACCOUNT_BALANCES, message: MOCK_MESSAGE, showTokenBalanceChanges: false },
};

// Clicking Simulate replays the captured mainnet response, driving the card into its `done` state:
// program logs, CU profiling, SOL balance changes, and token balance changes.
export const Done: Story = {
    args: { message: simulatedMessage, showTokenBalanceChanges: true },
    decorators: [withClusterAccountsAndTokenInfo, withSimulatedRpc],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole('button', { name: 'Simulate' }));

        // Each card only appears once the simulation resolves and the pipeline interprets the data.
        await expect(await canvas.findByText('SOL Balance Changes')).toBeInTheDocument();
        await expect(await canvas.findByText('CU profiling')).toBeInTheDocument();
        await expect(await canvas.findByText('Tokens')).toBeInTheDocument();
    },
};
