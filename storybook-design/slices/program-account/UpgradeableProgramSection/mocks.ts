// Re-uses the program-account slice's mock data/providers — the isolated
// UpgradeableProgramSection copy renders against the same "program" parsedData
// fixture as the full-page and UpgradeableLoaderAccountSection stories.
export {
    MOCK_PROGRAM_ACCOUNT,
    MOCK_PROGRAM_DATA,
    MOCK_SECTION_ARGS,
    withMockProviders,
    withSuspense,
} from '../mocks';
