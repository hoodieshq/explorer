import type { Idl } from '@coral-xyz/anchor';
import idlMock from '@entities/idl/mocks/anchor/anchor-legacy-0.9.4-shank-waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF.json';
import type { Meta, StoryObj } from '@storybook/react';

import { AnchorFormattedIdl } from '../AnchorFormattedIdl';

const meta = {
    component: AnchorFormattedIdl,
    parameters: {
        docs: {
            description: {
                story: 'Format and render Anchor IDL',
            },
        },
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Features/IDL/Formatted IDL/UI/AnchorFormattedIdl',
} satisfies Meta<typeof AnchorFormattedIdl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DisplayLegacyShankIdl: Story = {
    args: {
        idl: idlMock as unknown as Idl,
        programId: '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc',
    },
};
