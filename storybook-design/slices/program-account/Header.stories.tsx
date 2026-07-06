import type { Meta, StoryObj } from '@storybook-config/types';

import { Header } from '@/app/components/Header';

import { MOCK_PROGRAM_ACCOUNT, MOCK_PROGRAM_ADDRESS, withMockProviders } from './mocks';

// For a program account the Header resolves to the ProgramHeader (program logo + name).
const meta = {
    component: Header,
    decorators: [withMockProviders],
    title: 'Design Slices/program-account/Header',
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        account: MOCK_PROGRAM_ACCOUNT,
        address: MOCK_PROGRAM_ADDRESS,
        isTokenInfoLoading: false,
    },
};
