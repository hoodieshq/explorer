import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { ProgramSecurityTxtCard } from '@/app/features/security-txt/ui/SecurityCard';

import { MOCK_PROGRAM_ADDRESS, MOCK_SECURITY_TXT, withMockProviders } from './mocks';

const meta = {
    component: ProgramSecurityTxtCard,
    decorators: [withMockProviders, withViewportFromGlobal],
    title: 'Design Slices/program-account/SecurityCard@Media',
} satisfies Meta<typeof ProgramSecurityTxtCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    pmpSecurityTxt: undefined,
    programAddress: MOCK_PROGRAM_ADDRESS,
    programDataSecurityTxt: MOCK_SECURITY_TXT,
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
