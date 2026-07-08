import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseVerifiedBuildCard } from './ProgramTabCards/VerifiedBuildCard';

import { MOCK_PARSED_DATA, MOCK_VERIFIED_BUILD, withMockProviders } from './mocks';

const meta = {
    component: BaseVerifiedBuildCard,
    decorators: [withMockProviders, withViewportFromGlobal],
    title: 'Design Slices/program-account/VerifiedBuildCard@Media',
} satisfies Meta<typeof BaseVerifiedBuildCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    data: MOCK_PARSED_DATA,
    isLoading: false,
    registryInfo: MOCK_VERIFIED_BUILD,
};

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
