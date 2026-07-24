import { withClusterAndAccounts, withTokenInfoBatch } from '@storybook-config/decorators';
import { withMockRpc, withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { DelegationsSection } from './WalletSubscriptionsCard';
import { DELEGATIONS } from './mocks';

const meta = {
    component: DelegationsSection,
    decorators: [withMockRpc, withClusterAndAccounts, withTokenInfoBatch, withViewportFromGlobal],
    title: 'Design Slices/subscriptions/Delegations@Media',
} satisfies Meta<typeof DelegationsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { delegations: DELEGATIONS };

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
