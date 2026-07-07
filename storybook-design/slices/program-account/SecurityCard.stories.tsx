import type { Meta, StoryObj } from '@storybook-config/types';

import { ProgramSecurityTxtCard } from '@/app/features/security-txt/ui/SecurityCard';

import { MOCK_PROGRAM_ADDRESS, MOCK_SECURITY_TXT, withMockProviders } from './mocks';

// Security tab content. The top-level SecurityCard parses security.txt out of the
// program's on-chain binary; we render the exported presentational variant instead
// so the table data is deterministic without a binary fixture.
const meta = {
    component: ProgramSecurityTxtCard,
    decorators: [withMockProviders],
    title: 'Design Slices/program-account/SecurityCard',
} satisfies Meta<typeof ProgramSecurityTxtCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Neodyme security.txt embedded in program data (self-reported by the author).
export const Default: Story = {
    args: {
        pmpSecurityTxt: undefined,
        programAddress: MOCK_PROGRAM_ADDRESS,
        programDataSecurityTxt: MOCK_SECURITY_TXT,
    },
};

// Program has no security.txt → the empty-state card prompting the author to add one.
export const Empty: Story = {
    args: {
        pmpSecurityTxt: undefined,
        programAddress: MOCK_PROGRAM_ADDRESS,
        programDataSecurityTxt: undefined,
    },
};
