import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { ReceivedSubscriptionsSection } from './WalletSubscriptionsCard';
import { RECEIVED_SUBSCRIPTIONS } from './mocks';

// This is the only block that has live data for the target wallet — the row here is REAL.
const meta = {
    component: ReceivedSubscriptionsSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch],
    parameters: nextjsParameters,
    title: 'Design Slices/subscriptions/ReceivedSubscriptions',
} satisfies Meta<typeof ReceivedSubscriptionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { delegations: RECEIVED_SUBSCRIPTIONS },
};
