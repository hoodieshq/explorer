import type { Meta, StoryObj } from '@storybook/react';

import idlMock from '@entities/idl/mocks/codama/codama-1.2.11-from-anchor-0.3.4-whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc.json';
import { CodamaFormattedIdl } from '../CodamaFormattedIdl';

const meta = {
    component: CodamaFormattedIdl,
    parameters: {
        docs: {
            description: {
                story: 'Format and render Codama IDL',
            },
        },
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs'],
    title: 'Features/IDL/Formatted IDL/ui/CodamaFormattedIdl',
} satisfies Meta<typeof CodamaFormattedIdl>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
    args: {
        idl: idlMock as any,
    },
};
