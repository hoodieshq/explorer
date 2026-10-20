import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BaseInstructionIntentList } from '../BaseInstructionIntentList';
import { BaseInstructionIntentListItem } from '../BaseInstructionIntentListItem';

const meta = {
    args: {
        'aria-controls': 'intent-list',
        children: Array.from({ length: 5 }, (_, index) => (
            <BaseInstructionIntentListItem key={index} index={index}>
                Transfer 1 SOL to a wallet
            </BaseInstructionIntentListItem>
        )),
        ixsCount: 5,
        listId: 'intent-list',
        onToggle: fn(),
        open: false,
    },
    component: BaseInstructionIntentList,
    tags: ['autodocs', 'test'],
    title: 'Entities/InstructionIntent/BaseInstructionIntentList',
} satisfies Meta<typeof BaseInstructionIntentList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByTestId('instruction-intent-list-count')).toHaveTextContent('5 instructions');
        await expect(canvas.getByTestId('instruction-intent-list-toggle')).toHaveAttribute('aria-expanded', 'false');
        await expect(canvas.getByRole('button', { name: 'Show intents' })).toBeInTheDocument();
    },
};

export const Open: Story = {
    args: { open: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('button', { name: 'Hide intents' })).toHaveAttribute(
            'aria-controls',
            'intent-list',
        );
    },
};

export const ToggleFromHeader: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByText('What this transaction does'));
        await expect(args.onToggle).toHaveBeenCalledOnce();
    },
};

export const ToggleFromChevron: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByTestId('instruction-intent-list-toggle'));
        await expect(args.onToggle).toHaveBeenCalledOnce();
    },
};

export const OneInstruction: Story = {
    args: { ixsCount: 1 },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByTestId('instruction-intent-list-count')).toHaveTextContent(
            '1 instruction',
        );
    },
};
