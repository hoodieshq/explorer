import type { Meta, StoryObj } from '@storybook-config/types';

import { ProgramMultisigCard } from '@/app/components/account/ProgramMultisigCard';

import { MOCK_MULTISIG_ARGS, withMockRpc, withMultisigData } from './mocks';

// Program Multisig tab content — the upgrade-authority Squads multisig. The card
// reads two squads SWR caches; `withMultisigData` seeds both with a populated
// Squads V4 multisig so the table renders without live squads/anchor lookups.
const meta = {
    component: ProgramMultisigCard,
    decorators: [withMockRpc, withMultisigData],
    title: 'Design Slices/program-account/ProgramMultisigCard',
} satisfies Meta<typeof ProgramMultisigCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Squads V4 multisig with a 2-of-3 approval threshold.
export const Default: Story = {
    args: MOCK_MULTISIG_ARGS,
};
