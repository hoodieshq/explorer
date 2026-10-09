import type { Meta, StoryObj } from '@storybook-config/types';
import { expect, userEvent, within } from 'storybook/test';

import { BaseIdlSelectUnavailable } from '../BaseIdlSelectUnavailable';

const meta = {
    component: BaseIdlSelectUnavailable,
    tags: ['autodocs', 'test'],
    title: 'Entities/IDL/BaseIdlSelectUnavailable',
} satisfies Meta<typeof BaseIdlSelectUnavailable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'IDL: RPC, unavailable' }));
        await expect(within(document.body).getByText('Custom IDL unavailable')).toBeInTheDocument();
    },
};
