import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BaseResetButton } from '../BaseResetButton';

const meta: Meta<typeof BaseResetButton> = {
    args: { 'aria-label': 'Clear status filter', onClick: fn() },
    component: BaseResetButton,
    tags: ['autodocs', 'test'],
    title: 'Shared/Filters/BaseResetButton',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Clear status filter' }));
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};

export const WithLabel: Story = {
    args: { 'aria-label': 'Clear all filters', label: 'Reset all' },
};
