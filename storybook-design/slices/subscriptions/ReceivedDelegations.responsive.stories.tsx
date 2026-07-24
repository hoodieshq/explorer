import { withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { ReceivedDelegationsSection } from './WalletSubscriptionsCard';
import { RECEIVED_DELEGATIONS } from './mocks';

const meta = {
    component: ReceivedDelegationsSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch, withViewportFromGlobal],
    title: 'Design Slices/subscriptions/ReceivedDelegations@Media',
} satisfies Meta<typeof ReceivedDelegationsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { delegations: RECEIVED_DELEGATIONS };

export const Mobile: Story = {
    args,
    globals: { viewport: { value: 'iphonex' } },
};

export const TabletPortrait: Story = {
    args,
    globals: { viewport: { value: 'ipad' } },
};

export const TabletLandscape: Story = {
    args,
    globals: { viewport: { isRotated: true, value: 'ipad' } },
};
