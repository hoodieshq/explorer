import { withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { SubscriptionsSection } from './WalletSubscriptionsCard';
import { SUBSCRIPTIONS } from './mocks';

const meta = {
    component: SubscriptionsSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch, withViewportFromGlobal],
    title: 'Design Slices/subscriptions/Subscriptions@Media',
} satisfies Meta<typeof SubscriptionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { delegations: SUBSCRIPTIONS };

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
