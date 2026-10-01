import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, within } from 'storybook/test';

import { ToggleChip } from '../ToggleChip';

// The on/off chip behind the transaction Logs section's Parsed / RAW switch and the Token Holdings rows'
// Token History filter toggle. Flip `active` via the controls to compare the two states.
const meta = {
    args: { active: false, children: 'RAW' },
    component: ToggleChip,
    parameters: {
        docs: {
            description: {
                component: [
                    'Small on/off button built on the shared `Button`: `default` + accent border when on, `outline` when off.',
                    '',
                    '## References',
                    '',
                    '- [Button](?path=/docs/components-shared-button--docs)',
                ].join('\n'),
            },
        },
    },
    tags: ['autodocs', 'test'],
    title: 'Components/Shared/ToggleChip',
} satisfies Meta<typeof ToggleChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inactive: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button', { name: 'RAW' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    },
};

export const Active: Story = {
    args: { active: true, children: 'Parsed' },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button', { name: 'Parsed' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    },
};
