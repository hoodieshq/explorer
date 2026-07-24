import { nextjsParameters, withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { DelegationsSection } from './WalletSubscriptionsCard';
import { DELEGATIONS } from './mocks';

const meta = {
    component: DelegationsSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch],
    parameters: nextjsParameters,
    title: 'Design Slices/subscriptions/Delegations',
} satisfies Meta<typeof DelegationsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: { delegations: DELEGATIONS },
};
