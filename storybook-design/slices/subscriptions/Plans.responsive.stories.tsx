import { withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { PlansSection } from './WalletSubscriptionsCard';
import { PLANS } from './mocks';

const meta = {
    component: PlansSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch, withViewportFromGlobal],
    title: 'Design Slices/subscriptions/Plans@Media',
} satisfies Meta<typeof PlansSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { plans: PLANS };

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
