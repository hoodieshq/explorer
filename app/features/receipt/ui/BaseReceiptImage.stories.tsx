import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { BaseReceiptImage, IMAGE_SIZE } from './BaseReceiptImage';

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
    decorators: [
        Story => (
            <div style={{ height: IMAGE_SIZE.height, width: IMAGE_SIZE.width }}>
                <Story />
            </div>
        ),
    ],
    title: 'Features/Receipt/ReceiptImage',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            fee: '2.50',
            network: 'Mainnet',
            receiver: 'Hd3f3...R3bD4',
            sender: '24x5...L3bD5',
            total: '143.25',
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const receipt = canvas.getByText('Receipt');
        expect(receipt).toBeInTheDocument();
    },
};

export const LargeAmount: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            fee: '5000',
            memo: 'Large transfer',
            network: 'Mainnet',
            receiver: 'Hd3f3...R3bD4',
            sender: '24x5...L3bD5',
            total: '100000.00',
        },
    },
};

export const LongMemo: Story = {
    args: {
        data: {
            date: 'Jan 13, 2026 at 16:07:42',
            fee: '0.000005',
            memo: 'This is a very long description that demonstrates how the receipt component handles extended text content. It includes multiple sentences and various details about the transaction, such as the purpose of the payment, the services rendered, and any additional context that might be relevant to understanding the nature of this particular blockchain transaction on the Solana network.',
            network: 'Mainnet',
            receiver: 'Hd3f3...R3bD4',
            sender: '24x5...L3bD5',
            total: '1250.75',
        },
    },
};

export const NoReceipt: Story = {
    args: {
        data: null,
    },
};
