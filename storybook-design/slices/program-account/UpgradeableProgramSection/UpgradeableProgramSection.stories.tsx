import type { Meta, StoryObj } from '@storybook-config/types';

import { MOCK_PROGRAM_ACCOUNT, MOCK_PROGRAM_DATA, MOCK_SECTION_ARGS, withMockProviders, withSuspense } from './mocks';
import { UpgradeableProgramSection } from './UpgradeableProgramSection';

// MOCK_SECTION_ARGS.parsedData is always the `program` variant in this fixture.
const programAccount =
    MOCK_SECTION_ARGS.parsedData.type === 'program'
        ? MOCK_SECTION_ARGS.parsedData.info
        : { programData: MOCK_SECTION_ARGS.account.pubkey };

const meta = {
    component: UpgradeableProgramSection,
    decorators: [withSuspense, withMockProviders],
    title: 'Design Slices/program-account/UpgradeableProgramSection',
} satisfies Meta<typeof UpgradeableProgramSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        account: MOCK_PROGRAM_ACCOUNT,
        programAccount,
        programData: MOCK_PROGRAM_DATA,
    },
};

// Upgrade authority revoked → program is frozen (non-upgradeable).
export const Frozen: Story = {
    args: {
        account: MOCK_PROGRAM_ACCOUNT,
        programAccount,
        programData: { ...MOCK_PROGRAM_DATA, authority: null },
    },
};

// programData undefined → the program account has been closed.
export const Closed: Story = {
    args: {
        account: { ...MOCK_PROGRAM_ACCOUNT, executable: false },
        programAccount,
        programData: undefined,
    },
};
