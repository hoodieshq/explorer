import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { UpgradeableLoaderAccountSection } from '@/app/components/account/UpgradeableLoaderAccountSection';

import { MOCK_SECTION_ARGS, withMockProviders, withSuspense } from './mocks';

const meta = {
    component: UpgradeableLoaderAccountSection,
    decorators: [withSuspense, withMockProviders, withViewportFromGlobal],
    title: 'Design Slices/program-account/UpgradeableLoaderAccountSection@Media',
} satisfies Meta<typeof UpgradeableLoaderAccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = MOCK_SECTION_ARGS;

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
