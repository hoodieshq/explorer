import type { Meta, StoryObj } from '@storybook-config/types';

import { UpgradeableLoaderAccountSection } from '@/app/components/account/UpgradeableLoaderAccountSection';

import { MOCK_PROGRAM_ACCOUNT, MOCK_PROGRAM_DATA, MOCK_SECTION_ARGS, withMockProviders, withSuspense } from './mocks';

const meta = {
    component: UpgradeableLoaderAccountSection,
    decorators: [withSuspense, withMockProviders],
    title: 'Design Slices/program-account/UpgradeableLoaderAccountSection',
} satisfies Meta<typeof UpgradeableLoaderAccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: MOCK_SECTION_ARGS,
};

// Upgrade authority revoked → program is frozen (non-upgradeable).
export const Frozen: Story = {
    args: {
        ...MOCK_SECTION_ARGS,
        programData: { ...MOCK_PROGRAM_DATA, authority: null },
    },
};

// programData undefined → the program account has been closed.
export const Closed: Story = {
    args: {
        account: { ...MOCK_PROGRAM_ACCOUNT, executable: false },
        parsedData: MOCK_SECTION_ARGS.parsedData,
        programData: undefined,
    },
};
