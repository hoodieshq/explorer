import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, within } from 'storybook/test';

import { BaseInstructionIntentList } from '../BaseInstructionIntentList';
import { BaseInstructionIntentListItem } from '../BaseInstructionIntentListItem';

const meta = {
    component: BaseInstructionIntentListItem,
    tags: ['autodocs', 'test'],
    title: 'Entities/InstructionIntent/BaseInstructionIntentListItem',
} satisfies Meta<typeof BaseInstructionIntentListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderList(rows: { index: number; text: string; href?: string }[]) {
    return (
        <BaseInstructionIntentList ixsCount={rows.length} listId="intent-list" onToggle={fn()} open>
            {rows.map(row => (
                <BaseInstructionIntentListItem key={row.index} index={row.index} href={row.href}>
                    {row.text}
                </BaseInstructionIntentListItem>
            ))}
        </BaseInstructionIntentList>
    );
}

export const OneRow: Story = {
    args: { children: 'Transfer 1 SOL to a wallet', index: 0 },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('#1')).toBeInTheDocument();
    },
    render: () => renderList([{ index: 0, text: 'Transfer 1 SOL to a wallet' }]),
};

export const TwoDigitNumbers: Story = {
    args: { children: 'Transfer 1 SOL to a wallet', index: 8 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('#9')).toBeInTheDocument();
        await expect(canvas.getByText('#10')).toBeInTheDocument();

        const lefts = canvas
            .getAllByTestId('instruction-intent-list-item')
            .map(item => item.lastElementChild?.getBoundingClientRect().left);
        await expect(lefts).toHaveLength(2);
        await expect(lefts[0]).toBe(lefts[1]);
    },
    render: () =>
        renderList([
            { index: 8, text: 'Transfer 1 SOL to a wallet' },
            { index: 9, text: 'Transfer 2 SOL to another wallet' },
        ]),
};

export const LinkedRow: Story = {
    args: { children: 'Transfer 1 SOL to a wallet', href: '#ix-3', index: 2 },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('link', { name: '#3' })).toHaveAttribute('href', '#ix-3');
    },
    render: () => renderList([{ href: '#ix-3', index: 2, text: 'Transfer 1 SOL to a wallet' }]),
};

export const WrappedSentence: Story = {
    args: { children: 'Transfer 1 SOL to a wallet', index: 0 },
    render: () =>
        renderList([
            {
                index: 0,
                text: 'Transfer 1000 tokens from a very long source account name to an equally long destination account name so that the sentence wraps onto the next line',
            },
        ]),
};
