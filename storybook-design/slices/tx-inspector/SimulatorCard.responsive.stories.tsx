import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { SimulatorCard } from '../../vendor/features/instruction-simulation/ui/SimulationCard';
import {
    DEFAULT_HANDLERS,
    MOCK_ACCOUNT_BALANCES,
    MOCK_MESSAGE,
    nextjsParameters,
    withInspectorProviders,
} from './mocks';

const meta = {
    component: SimulatorCard,
    decorators: [withInspectorProviders, withViewportFromGlobal],
    parameters: { ...nextjsParameters, msw: { handlers: DEFAULT_HANDLERS } },
    title: 'Design Slices/tx-inspector/SimulatorCard@Media',
} satisfies Meta<typeof SimulatorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { accountBalances: MOCK_ACCOUNT_BALANCES, message: MOCK_MESSAGE, showTokenBalanceChanges: false };

export const Mobile: Story = { args, globals: { viewport: { value: 'iphonex' } } };
export const TabletPortrait: Story = { args, globals: { viewport: { value: 'ipad' } } };
export const TabletLandscape: Story = { args, globals: { viewport: { isRotated: true, value: 'ipad' } } };
