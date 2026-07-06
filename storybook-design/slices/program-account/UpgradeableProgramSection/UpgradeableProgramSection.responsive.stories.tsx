import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { UpgradeableProgramSection } from './UpgradeableProgramSection';
import { MOCK_PROGRAM_ACCOUNT, MOCK_PROGRAM_DATA, MOCK_SECTION_ARGS, withMockProviders, withSuspense } from './mocks';

const programAccount =
    MOCK_SECTION_ARGS.parsedData.type === 'program'
        ? MOCK_SECTION_ARGS.parsedData.info
        : { programData: MOCK_SECTION_ARGS.account.pubkey };

const meta = {
    component: UpgradeableProgramSection,
    decorators: [withSuspense, withMockProviders, withViewportFromGlobal],
    title: 'Design Slices/program-account/UpgradeableProgramSection@Media',
} satisfies Meta<typeof UpgradeableProgramSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    account: MOCK_PROGRAM_ACCOUNT,
    programAccount,
    programData: MOCK_PROGRAM_DATA,
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
