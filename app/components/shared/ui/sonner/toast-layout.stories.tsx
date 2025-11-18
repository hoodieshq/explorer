import type { Meta, StoryObj } from '@storybook/react';
import { ReactNode } from 'react';
import { expect, within } from 'storybook/test';

import { ToastLayout } from './toast-layout';

const meta = {
    component: ToastLayout,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    title: 'Components/Shared/UI/Sonner/ToastLayout',
} satisfies Meta<typeof ToastLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const Button = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button className="e-rounded e-border-0 e-bg-blue-500 e-px-3 e-py-1 e-text-white" onClick={onClick}>
        {children}
    </button>
);

export const Default: Story = {
    args: {
        children: 'This is a toast message without a button',
    },
    async play({ canvasElement }) {
        const canvas = within(canvasElement);

        // Check that the main container has the correct classes
        const container = canvas.getByText('This is a toast message without a button').parentElement;
        expect(container).toBeInTheDocument();

        // Check that the text is wrapped in a paragraph with flex-1
        const paragraph = canvas.getByText('This is a toast message without a button');
        expect(paragraph).toBeInTheDocument();

        // Check that no button is rendered
        const buttons = canvas.queryAllByRole('button');
        expect(buttons).toHaveLength(0);
    },
};

export const WithButton: Story = {
    args: {
        button: <Button>Action</Button>,
        children: 'This is a toast message with an action button',
    },
    async play({ canvasElement }) {
        const canvas = within(canvasElement);

        // Check that the text is rendered
        const text = canvas.getByText('This is a toast message with an action button');
        expect(text).toBeInTheDocument();

        // Check that the button is rendered
        const button = canvas.getByRole('button', { name: 'Action' });
        expect(button).toBeInTheDocument();
    },
};
