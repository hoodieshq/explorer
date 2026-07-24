import { withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { ReceivedSubscriptionsSection } from './WalletSubscriptionsCard';
import { RECEIVED_SUBSCRIPTIONS } from './mocks';

const meta = {
    component: ReceivedSubscriptionsSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch, withViewportFromGlobal],
    title: 'Design Slices/subscriptions/ReceivedSubscriptions@Media',
} satisfies Meta<typeof ReceivedSubscriptionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { delegations: RECEIVED_SUBSCRIPTIONS };

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
