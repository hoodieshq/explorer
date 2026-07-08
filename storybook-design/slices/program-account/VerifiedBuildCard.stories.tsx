import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseVerifiedBuildCard } from './ProgramTabCards/VerifiedBuildCard';

import { MOCK_PARSED_DATA, MOCK_VERIFIED_BUILD, withMockProviders } from './mocks';

// Verified Build tab content. The top-level VerifiedBuildCard fetches the osec.io
// registry via useVerifiedProgram; we render the exported presentational variant
// with a mock registry payload so the states are deterministic.
const meta = {
    component: BaseVerifiedBuildCard,
    decorators: [withMockProviders],
    title: 'Design Slices/program-account/VerifiedBuildCard',
} satisfies Meta<typeof BaseVerifiedBuildCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Verified program — full registry table (hashes, uploader, verify command, repo).
export const Default: Story = {
    args: {
        data: MOCK_PARSED_DATA,
        isLoading: false,
        registryInfo: MOCK_VERIFIED_BUILD,
    },
};

// Fetching the last verified build hash.
export const Loading: Story = {
    args: {
        data: MOCK_PARSED_DATA,
        isLoading: true,
        registryInfo: null,
    },
};

// No registry entry → prompt to upload verified build information.
export const NotUploaded: Story = {
    args: {
        data: MOCK_PARSED_DATA,
        isLoading: false,
        registryInfo: null,
    },
};
