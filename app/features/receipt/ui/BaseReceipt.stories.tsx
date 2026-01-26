import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { BaseReceipt } from './BaseReceipt';

const meta: Meta<typeof BaseReceipt> = {
    argTypes: {
        data: {
            control: 'object',
            description: 'Receipt data with confirmation status',
        },
    },
    component: BaseReceipt,
    title: 'Features/Receipt/BaseReceipt',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        data: {
            confirmationStatus: 'finalized',
            date: {
                timestamp: 1737100062,
                utc: 'Jan 13, 2026 at 16:07:42',
            },
            fee: '0.000005',
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
                raw: '143250000000',
                unit: 'SOL',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const receipt = canvas.getByText('Solana Receipt');
        expect(receipt).toBeInTheDocument();
    },
};

export const WithMemo: Story = {
    args: {
        data: {
            confirmationStatus: 'finalized',
            date: {
                timestamp: 1737100062,
                utc: 'Jan 13, 2026 at 16:07:42',
            },
            fee: '0.000005',
            memo: 'This is a very long description that demonstrates how the receipt component handles extended text content. It includes multiple sentences and various details about the transaction, such as the purpose of the payment, the services rendered, and any additional context that might be relevant to understanding the nature of this particular blockchain transaction on the Solana network.',
            network: 'Mainnet',
            receiver: {
                address: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
                truncated: 'Hd3f3...R3bD4',
            },
            sender: {
                address: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
                truncated: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
            },
            total: {
                formatted: '50.00',
                raw: '50000000000',
                unit: 'SOL',
            },
        },
    },
};

export const LargeAmount: Story = {
    args: {
        data: {
            confirmationStatus: 'finalized',
            date: {
                timestamp: 1737100062,
                utc: 'Jan 13, 2026 at 16:07:42',
            },
            fee: '5000',
            network: 'Mainnet',
            receiver: {
                address: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
                truncated: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
            },
            sender: {
                address: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
                truncated: '24x5...L3bD5',
            },
            total: {
                formatted: '100000.00',
                raw: '100000000000000',
                unit: 'SOL',
            },
        },
    },
};

export const SmallAmount: Story = {
    args: {
        data: {
            confirmationStatus: 'confirmed',
            date: {
                timestamp: 1737100062,
                utc: 'Jan 13, 2026 at 16:07:42',
            },
            fee: '0.000005',
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
                formatted: '0.001',
                raw: '1000000',
                unit: 'SOL',
            },
        },
    },
};
