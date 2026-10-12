import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FilterDropdown } from '../FilterDropdown';

const VERSIONS = [
    { count: 819, label: 'Legacy', value: 'legacy' },
    { count: 305, label: 'v0', value: '0' },
    { count: 213, label: 'v1', value: '1' },
];

const meta: Meta<typeof FilterDropdown> = {
    args: { 'aria-label': 'Transaction version', onChange: fn(), options: VERSIONS, selected: [] },
    component: FilterDropdown,
    decorators: [
        Story => (
            <div style={{ width: 240 }}>
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs', 'test'],
    title: 'Shared/Filters/FilterDropdown',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Transaction version' }));
        // The list renders in a portal, outside the canvas.
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByText('v0'));
        await expect(args.onChange).toHaveBeenCalledWith(['0']);
    },
};

export const Searchable: Story = {
    args: { searchPlaceholder: 'Search versions', searchable: true, selected: ['legacy'] },
};

export const Multiple: Story = {
    args: { multiple: true, selected: ['legacy', '0'] },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Transaction version' }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByText('v1'));
        await expect(args.onChange).toHaveBeenCalledWith(['legacy', '0', '1']);
        // Several picks keep the list open.
        await expect(body.getAllByRole('checkbox')).toHaveLength(3);
    },
};
