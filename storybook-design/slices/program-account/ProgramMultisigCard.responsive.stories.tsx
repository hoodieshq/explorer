import { withViewportFromGlobal } from '@storybook-config/responsive-decorators';
import type { Meta, StoryObj } from '@storybook-config/types';

import { ProgramMultisigCard } from '@/app/components/account/ProgramMultisigCard';

import { MOCK_MULTISIG_ARGS, withMockRpc, withMultisigData } from './mocks';

const meta = {
    component: ProgramMultisigCard,
    decorators: [withMockRpc, withMultisigData, withViewportFromGlobal],
    title: 'Design Slices/program-account/ProgramMultisigCard@Media',
} satisfies Meta<typeof ProgramMultisigCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = MOCK_MULTISIG_ARGS;

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
