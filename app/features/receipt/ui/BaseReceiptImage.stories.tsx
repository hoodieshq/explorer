import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { BaseReceiptImage } from './BaseReceiptImage';

const meta: Meta<typeof BaseReceiptImage> = {
    argTypes: {
        data: {
            control: 'object',
            description: 'Receipt data',
        },
        options: {
            control: 'object',
            description: 'Receipt options',
        },
    },
    component: BaseReceiptImage,
    title: 'Features/Receipt/ReceiptImage',
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultAddress = 'TokenzQqasd1823...C1PXEpPxuEbasdnh891';

export const Default: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            description: 'Pizza payment',
            fee: '2.50',
            network: 'Mainnet',
            receiver: defaultAddress,
            sender: defaultAddress,
            total: '143.25',
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const receipt = canvas.getByText('Receipt');
        expect(receipt).toBeInTheDocument();
    },
};

export const WithoutDescription: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            fee: '2.50',
            network: 'Mainnet',
            receiver: defaultAddress,
            sender: defaultAddress,
            total: '143.25',
        },
    },
};

export const WithoutFee: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            network: 'Mainnet',
            receiver: defaultAddress,
            sender: defaultAddress,
            total: '143.25',
        },
    },
};

export const LargeAmount: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            description: 'Large transfer',
            fee: '5000',
            network: 'Mainnet',
            receiver: defaultAddress,
            sender: defaultAddress,
            total: '100000.00',
        },
    },
};

export const LongDescription: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            description:
                'This is a very long description that demonstrates how the receipt component handles extended text content. It includes multiple sentences and various details about the transaction, such as the purpose of the payment, the services rendered, and any additional context that might be relevant to understanding the nature of this particular blockchain transaction on the Solana network.',
            fee: '0.000005',
            network: 'Mainnet',
            receiver: defaultAddress,
            sender: defaultAddress,
            total: '1250.75',
        },
    },
};

export const Minimal: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            description: 'Pizza payment',
            fee: '2.50',
            network: 'Mainnet',
            receiver: defaultAddress,
            sender: defaultAddress,
            total: '143.25',
        },
        options: {
            minimal: true,
        },
    },
};
