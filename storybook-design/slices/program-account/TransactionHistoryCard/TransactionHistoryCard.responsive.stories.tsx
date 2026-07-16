import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { withColumnWidth } from '../../../decorators';
import { MOCK_PROGRAM_ADDRESS, nextjsParameters, withInstructionData, withMockRpc } from './mocks';
import { TransactionHistoryCard } from './TransactionHistoryCard';

const meta = {
    component: TransactionHistoryCard,
    // Resolved programs (withInstructionData) so the mobile stacked layout shows real content.
    decorators: [withMockRpc, withInstructionData, withViewportFromGlobal, withColumnWidth],
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
