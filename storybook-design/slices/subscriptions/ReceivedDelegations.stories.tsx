import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { ReceivedDelegationsSection } from './WalletSubscriptionsCard';
import { RECEIVED_DELEGATIONS } from './mocks';

const meta = {
    component: ReceivedDelegationsSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch],
    parameters: nextjsParameters,
    title: 'Design Slices/subscriptions/ReceivedDelegations',
} satisfies Meta<typeof ReceivedDelegationsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { delegations: RECEIVED_DELEGATIONS },
};
