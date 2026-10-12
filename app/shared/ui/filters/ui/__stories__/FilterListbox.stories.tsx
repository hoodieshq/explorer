import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FilterListbox } from '../FilterListbox';

const PROGRAMS = [
    { count: 1033, label: 'All Transactions', value: 'all' },
    { count: 677, label: 'Vote Program', value: 'vote' },
    { count: 356, label: 'All Except Votes', value: '' },
    { count: 327, label: 'Compute Budget Program', value: 'compute' },
    { count: 185, label: 'System Program', value: 'system' },
    { count: 133, label: 'Token Program', value: 'token' },
    { count: 103, label: 'Associated Token Program', value: 'ata' },
    { count: 77, label: 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ', value: 'pfee' },
    { count: 41, label: 'Token-2022 Program', value: 'token-2022' },
    { count: 12, label: 'Memo Program', value: 'memo' },
];

const meta: Meta<typeof FilterListbox> = {
    args: { onChange: fn(), options: PROGRAMS, searchPlaceholder: 'Search programs', selected: [''] },
    component: FilterListbox,
    decorators: [
        Story => (
            <div style={{ width: 320 }}>
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs', 'test'],
    title: 'Shared/Filters/FilterListbox',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByRole('combobox', { name: 'Search programs' }), 'token');
        await expect(canvas.getAllByRole('option')).toHaveLength(3);
        await userEvent.click(canvas.getByText('Token Program'));
        await expect(args.onChange).toHaveBeenCalledWith(['token']);
    },
};

export const NoMatches: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const list = canvas.getByRole('listbox').parentElement as HTMLElement;
        const fullHeight = list.offsetHeight;
        await userEvent.type(canvas.getByRole('combobox', { name: 'Search programs' }), 'zzz');
        await expect(canvas.getByText('No matches')).toBeInTheDocument();
        // The window keeps the height it had with every option, so nothing below it jumps.
        await expect(list.offsetHeight).toBe(fullHeight);
    },
};

export const Multiple: Story = {
    args: { multiple: true, selected: ['token', 'ata'] },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByText('System Program'));
        await expect(args.onChange).toHaveBeenCalledWith(['system', 'token', 'ata']);
    },
};

export const Keyboard: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        const search = canvas.getByRole('combobox', { name: 'Search programs' });
        await userEvent.click(search);
        await userEvent.keyboard('token');
        // The pick ("All Except Votes") is filtered out, so the first match is highlighted; one step down is the next.
        await userEvent.keyboard('{ArrowDown}{Enter}');
        await expect(args.onChange).toHaveBeenCalledWith(['ata']);
        // Escape with text clears the search rather than leaving the field.
        await userEvent.keyboard('{Escape}');
        await expect(search).toHaveValue('');
        await expect(search).toHaveFocus();
    },
};
