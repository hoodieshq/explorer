import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { ClusterProvider } from '@/app/providers/cluster';

import { SearchBar } from '../SearchBar';

const meta: Meta<typeof SearchBar> = {
    component: SearchBar,
    decorators: [
        Story => (
            <ClusterProvider>
                <Story />
            </ClusterProvider>
        ),
    ],
    parameters: {
        layout: 'padded',
        nextjs: {
            appDirectory: true,
        },
    },
    title: 'Components/SearchBar',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('combobox');
        expect(input).toBeInTheDocument();

        const placeholder = canvas.getByText(/Search for blocks, accounts, transactions/i);
        expect(placeholder).toBeInTheDocument();
    },
};
export const PointerEventsEnabled: Story = {
    name: 'Pointer Events Enabled (Mobile Context Menu Fix)',
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('combobox');

        // Find the control container by traversing up from the input
        // The control is the ancestor with role and classes applied by react-select
        const control = input.closest('[class*="control"]');

        expect(control).toBeInTheDocument();

        // Verify pointer-events is set to 'all' on the control
        // This is critical for mobile Safari to show context menu (copy/paste) on long-press
        const ctx = control!.ownerDocument.defaultView!;
        const computedStyle = ctx.getComputedStyle(control as Element);
        expect(computedStyle.pointerEvents).toBe('all');

        // Verify the input is focusable (touch-action should not be 'none')
        expect(input).not.toHaveStyle({ touchAction: 'none' });
    },
};
