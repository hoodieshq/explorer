import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BaseFilterSection } from '../BaseFilterSection';
import { BaseToggleChips } from '../BaseToggleChips';

const meta: Meta<typeof BaseFilterSection> = {
    args: {
        children: (
            <BaseToggleChips
                onChange={fn()}
                options={[
                    { label: 'Succeeded', value: 'succeeded' },
                    { label: 'Failed', value: 'failed' },
                ]}
                selected={['failed']}
            />
        ),
        onReset: fn(),
        title: 'Status',
    },
    component: BaseFilterSection,
    tags: ['autodocs', 'test'],
    title: 'Shared/Filters/BaseFilterSection',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Clear status filter' }));
        await expect(args.onReset).toHaveBeenCalledOnce();
    },
};

export const NothingToReset: Story = {
    args: { onReset: undefined },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).queryByRole('button', { name: 'Clear status filter' }),
        ).not.toBeInTheDocument();
    },
};
