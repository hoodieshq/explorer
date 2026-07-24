import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { SubscriptionsSection } from './WalletSubscriptionsCard';
import { SUBSCRIPTIONS } from './mocks';

const meta = {
    component: SubscriptionsSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch],
    parameters: nextjsParameters,
    title: 'Design Slices/subscriptions/Subscriptions',
} satisfies Meta<typeof SubscriptionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { delegations: SUBSCRIPTIONS },
};
