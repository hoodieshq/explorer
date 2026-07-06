import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { Header } from '@/app/components/Header';

import { MOCK_PROGRAM_ACCOUNT, MOCK_PROGRAM_ADDRESS, withMockProviders } from './mocks';

const meta = {
    component: Header,
    decorators: [withMockProviders, withViewportFromGlobal],
    title: 'Design Slices/program-account/Header@Media',
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    account: MOCK_PROGRAM_ACCOUNT,
    address: MOCK_PROGRAM_ADDRESS,
    isTokenInfoLoading: false,
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
