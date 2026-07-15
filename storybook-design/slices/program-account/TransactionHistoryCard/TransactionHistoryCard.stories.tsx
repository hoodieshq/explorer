import { withColumnWidth } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { TransactionHistoryCard } from './TransactionHistoryCard';
import {
    MOCK_PROGRAM_ADDRESS,
    nextjsParameters,
    withEmptyHistoryProviders,
    withInstructionData,
    withMockProviders,
    withMockRpc,
} from './mocks';

const meta = {
    component: TransactionHistoryCard,
    // withColumnWidth caps the card at the `col` token (mirrors the page's content column);
    // withMockRpc supplies safe RPC stubs; per-story decorators supply the providers.
    decorators: [withColumnWidth, withMockRpc],
    parameters: nextjsParameters,
    title: 'Design Slices/program-account/TransactionHistoryCard',
} satisfies Meta<typeof TransactionHistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Programs resolve: VisibilityProvider enables the per-row fetch and getParsedTransaction
// is stubbed to return mock parsed txs. withInstructionData runs after the meta-level
// withMockRpc, overriding its undefined getParsedTransaction stub.
export const Default: Story = {
    args: { address: MOCK_PROGRAM_ADDRESS },
    decorators: [withInstructionData],
};

// Loading state: no VisibilityProvider, so each row's Programs list stays on its skeleton.
export const ParametersLoading: Story = {
    args: { address: MOCK_PROGRAM_ADDRESS },
    decorators: [withMockProviders],
};

export const EmptyHistory: Story = {
    args: { address: MOCK_PROGRAM_ADDRESS },
    decorators: [withEmptyHistoryProviders],
};
