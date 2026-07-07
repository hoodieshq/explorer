// Re-uses the program-account slice's mock data + provider decorators. The
// isolated TransactionHistoryCard copy renders against the same account-history
// fixtures as the full-page and page-level stories.
export {
    MOCK_PROGRAM_ADDRESS,
    nextjsParameters,
    withEmptyHistoryProviders,
    withInstructionData,
    withMockProviders,
    withMockRpc,
} from '../mocks';
