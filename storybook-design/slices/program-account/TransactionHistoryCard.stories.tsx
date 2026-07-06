import type { Meta, StoryObj } from '@storybook-config/types';

import { TransactionHistoryCard } from '@/app/features/transaction-history';

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
    // withMockRpc first (safe RPC stubs); per-story decorators supply the providers.
    decorators: [withMockRpc],
    parameters: nextjsParameters,
    title: 'Design Slices/program-account/TransactionHistoryCard',
} satisfies Meta<typeof TransactionHistoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Data rendered: VisibilityProvider enables the fetch and getParsedTransaction is stubbed
// to return mock parsed txs, so instruction names resolve. withInstructionData runs after
// the meta-level withMockRpc, overriding its undefined getParsedTransaction stub.
export const Default: Story = {
    args: { address: MOCK_PROGRAM_ADDRESS },
    decorators: [withInstructionData],
};

// Loading state: no VisibilityProvider, so each row's instruction list
// ("transaction parameters") stays on its skeleton.
export const ParametersLoading: Story = {
    args: { address: MOCK_PROGRAM_ADDRESS },
    decorators: [withMockProviders],
};

export const EmptyHistory: Story = {
    args: { address: MOCK_PROGRAM_ADDRESS },
    decorators: [withEmptyHistoryProviders],
};
