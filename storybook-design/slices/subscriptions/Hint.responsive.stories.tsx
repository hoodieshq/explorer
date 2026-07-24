import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { SubscriptionsHint } from './WalletSubscriptionsCard';

const meta = {
    component: SubscriptionsHint,
    decorators: [withViewportFromGlobal],
    title: 'Design Slices/subscriptions/Hint@Media',
} satisfies Meta<typeof SubscriptionsHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
    globals: { viewport: { value: 'iphonex' } },
};

export const TabletPortrait: Story = {
    globals: { viewport: { value: 'ipad' } },
};

export const TabletLandscape: Story = {
    globals: { viewport: { isRotated: true, value: 'ipad' } },
};
