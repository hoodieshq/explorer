import idlMock from '@entities/idl/mocks/anchor/anchor-legacy-0.3.6-whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc.json';
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
    tags: ['autodocs'],
    title: 'Features/IDL/Formatted IDL/ui/AnchorFormattedIdl',
} satisfies Meta<typeof AnchorFormattedIdl>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
    args: {
        idl: idlMock as any,
        programId: '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc',
    },
};
