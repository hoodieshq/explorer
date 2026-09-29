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
                    'The **Intent** toggle in an instruction card header, next to Raw. A text button rather than an ⓘ mark, because the icon reads as "help". The open state is styled off `aria-expanded`, so it cannot drift from what assistive tech hears. Absent — never disabled — for programs without published intents.',
                    '',
                    '## References',
                    '',
                    '- [Button](?path=/docs/components-shared-button--docs) (`variant="outline" size="sm"`) — the base; `aria-expanded:` utilities add the accent open state.',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
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
