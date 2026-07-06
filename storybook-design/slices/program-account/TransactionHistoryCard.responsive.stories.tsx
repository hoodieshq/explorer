import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { TransactionHistoryCard } from '@/app/features/transaction-history';

import { MOCK_PROGRAM_ADDRESS, nextjsParameters, withMockProviders, withMockRpc } from './mocks';

const meta = {
    component: TransactionHistoryCard,
    decorators: [withMockRpc, withMockProviders, withViewportFromGlobal],
    parameters: nextjsParameters,
    title: 'Design Slices/program-account/TransactionHistoryCard@Media',
} satisfies Meta<typeof TransactionHistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { address: MOCK_PROGRAM_ADDRESS };

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
