import type { Meta, StoryObj } from '@storybook-config/types';

import { BaseNftokenAttributes } from '../BaseNftokenAttributes';

const meta = {
    component: BaseNftokenAttributes,
    tags: ['autodocs', 'test'],
    title: 'Features/NFToken/NftokenAttributes',
} satisfies Meta<typeof BaseNftokenAttributes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        traits: [
            { type: 'Minted At', value: '2022-07-09T21:48:18.722Z' },
            { type: 'Minted By', value: '7kZ1h2mnwyhP3sKz8JgVdMmaMPswk3FuomTkPEnvRN8t' },
            { type: 'Glow ID', value: 'friends' },
        ],
    },
};

export const Empty: Story = {
    args: { traits: [] },
};
