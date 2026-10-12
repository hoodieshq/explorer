import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BaseToggleChips } from '../BaseToggleChips';

const meta: Meta<typeof BaseToggleChips> = {
    args: {
        onChange: fn(),
        options: [
            { label: 'Succeeded', value: 'succeeded' },
            { label: 'Failed', value: 'failed' },
        ],
        selected: [],
    },
    component: BaseToggleChips,
    tags: ['autodocs', 'test'],
    title: 'Shared/Filters/BaseToggleChips',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Failed' }));
        await expect(args.onChange).toHaveBeenLastCalledWith(['failed']);
    },
};

export const WithCounts: Story = {
    args: {
        options: [
            { count: 819, label: 'Legacy', value: 'legacy' },
            { count: 305, label: 'v0', value: '0' },
            { count: 213, label: 'v1', value: '1' },
        ],
        selected: ['legacy', '0'],
    },
};
