import { nextjsParameters } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { SubscriptionsHint } from './WalletSubscriptionsCard';

const meta = {
    component: SubscriptionsHint,
    parameters: nextjsParameters,
    title: 'Design Slices/subscriptions/Hint',
} satisfies Meta<typeof SubscriptionsHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
