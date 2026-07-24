import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { PlansSection } from './WalletSubscriptionsCard';
import { PLANS } from './mocks';

const meta = {
    component: PlansSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch],
    parameters: nextjsParameters,
    title: 'Design Slices/subscriptions/Plans',
} satisfies Meta<typeof PlansSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { plans: PLANS },
};
