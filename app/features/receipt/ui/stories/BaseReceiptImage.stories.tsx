import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { BaseReceiptImage, IMAGE_SIZE } from '../BaseReceiptImage';

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
    title: 'Features/Receipt/BaseReceiptImage',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        data: {
            date: {
                timestamp: 1737100062,
                utc: 'Jan 13, 2026 at 16:07:42',
            },
            fee: {
                formatted: '0.25',
                raw: 250000000,
            },
            network: 'Mainnet',
            receiver: {
                address: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
                truncated: 'Hd3f3...R3bD4',
            },
            sender: {
                address: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
                truncated: '24x5...L3bD5',
            },
            total: {
                formatted: '143.25',
                raw: 143250000000,
                unit: 'SOL',
            },
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
            date: {
                timestamp: 1737100062,
                utc: 'Jan 13, 2026 at 16:07:42',
            },
            fee: {
                formatted: '0.000005',
                raw: 5000,
            },
            memo: 'Large transfer',
            network: 'Mainnet',
            receiver: {
                address: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
                truncated: 'Hd3f3...R3bD4',
            },
            sender: {
                address: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
                truncated: '24x5...L3bD5',
            },
            total: {
                formatted: '100.00',
                raw: 100000000000,
                unit: 'SOL',
            },
        },
    },
};

export const LongMemo: Story = {
    args: {
        data: {
            date: {
                timestamp: 1737100062,
                utc: 'Jan 13, 2026 at 16:07:42',
            },
            fee: {
                formatted: '0.000005',
                raw: 5000,
            },
            memo: 'This is a very long description that demonstrates how the receipt component handles extended text content. It includes multiple sentences and various details about the transaction, such as the purpose of the payment, the services rendered, and any additional context that might be relevant to understanding the nature of this particular blockchain transaction on the Solana network.',
            network: 'Mainnet',
            receiver: {
                address: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
                truncated: 'Hd3f3...R3bD4',
            },
            sender: {
                address: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
                truncated: '24x5...L3bD5',
            },
            total: {
                formatted: '1250.75',
                raw: 1250750000,
                unit: 'SOL',
            },
        },
    },
};

export const TokenTransfer: Story = {
    args: {
        data: {
            date: {
                timestamp: 1737100062,
                utc: 'Jan 13, 2026 at 16:07:42',
            },
            fee: {
                formatted: '0.000005',
                raw: 5000,
            },
            memo: 'This is a very long description that demonstrates how the receipt component handles extended text content. It includes multiple sentences and various details about the transaction, such as the purpose of the payment, the services rendered, and any additional context that might be relevant to understanding the nature of this particular blockchain transaction on the Solana network.',
            network: 'Mainnet',
            receiver: {
                address: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
                truncated: 'Hd3f3...R3bD4',
            },
            sender: {
                address: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
                truncated: '24x5...L3bD5',
            },
            symbol: 'USDC',
            total: {
                formatted: '1250.75',
                raw: 1250750000,
                unit: 'USDC',
            },
        },
    },
};

export const NoReceipt: Story = {
    args: {
        data: undefined,
    },
};
