import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, fn, within } from 'storybook/test';

import { BaseInstructionIntentButton } from '../BaseInstructionIntentButton';

const meta: Meta<typeof BaseInstructionIntentButton> = {
    args: { onClick: fn() },
    component: BaseInstructionIntentButton,
    parameters: {
        docs: {
            description: {
                component: [
                    'The **Intent** toggle in an instruction card header, next to Raw. A text button rather than an ⓘ mark, because the icon reads as "help". The open state is styled off `aria-expanded`, so it cannot drift from what assistive tech hears. Icon-only below `md`. When the intent cannot be had, the outline turns dashed and dimmed — visible with the icon alone, at the same size — and the panel explains why.',
                    '',
                    '## References',
                    '',
                    '- [Button](?path=/docs/components-shared-button--docs) (`ui="dashkit" size="sm"`, `white` / `black` + `active`, `dashed`) — the same button as the Raw toggle beside it.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test', 'clear-sign'],
    title: 'Features/DecodeInstructionWithIdl/BaseInstructionIntentButton',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = { args: { open: false } };

export const Open: Story = {
    args: { open: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button', { name: 'Intent' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    },
};

export const Busy: Story = { args: { busy: true, open: true } };

export const Missing: Story = {
    args: { missing: true, open: false },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button', { name: 'Intent unavailable' }).className).toContain(
            'border-dashed',
        );
    },
};

export const MissingOpen: Story = { args: { missing: true, open: true } };
