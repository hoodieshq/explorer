import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { BaseReceipt } from './BaseReceipt';

const meta: Meta<typeof BaseReceipt> = {
    argTypes: {
        confirmationStatus: {
            control: 'select',
            description: 'Transaction confirmation status',
            options: ['confirmed', 'finalized', 'processed'],
        },
        date: {
            control: 'number',
            description: 'Transaction timestamp in milliseconds',
        },
        fee: {
            control: 'text',
            description: 'Transaction fee',
        },
        lamports: {
            control: 'number',
            description: 'Amount in lamports',
        },
        memo: {
            control: 'text',
            description: 'Transaction memo',
        },
        network: {
            control: 'text',
            description: 'Network name (e.g., Mainnet, Devnet)',
        },
        receiver: {
            control: 'text',
            description: 'Receiver address',
        },
        sender: {
            control: 'text',
            description: 'Sender address',
        },
    },
    component: BaseReceipt,
    title: 'Features/Receipt/BaseReceipt',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        confirmationStatus: 'finalized',
        date: Date.now() - 3600000,
        fee: '0.000005 SOL',
        lamports: 143250000000,
        network: 'Mainnet',
        receiver: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
        sender: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const receipt = canvas.getByText('Solana Receipt');
        expect(receipt).toBeInTheDocument();
    },
};

export const WithMemo: Story = {
    args: {
        confirmationStatus: 'finalized',
        date: Date.now() - 1800000,
        fee: '0.000005 SOL',
        lamports: 50000000000,
        memo: 'This is a very long description that demonstrates how the receipt component handles extended text content. It includes multiple sentences and various details about the transaction, such as the purpose of the payment, the services rendered, and any additional context that might be relevant to understanding the nature of this particular blockchain transaction on the Solana network.',
        network: 'Mainnet',
        receiver: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
        sender: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
    },
};

export const LargeAmount: Story = {
    args: {
        confirmationStatus: 'finalized',
        date: Date.now() - 86400000,
        fee: '5000 SOL',
        lamports: 100000000000000,
        network: 'Mainnet',
        receiver: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
        sender: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
    },
};

export const SmallAmount: Story = {
    args: {
        confirmationStatus: 'confirmed',
        date: Date.now() - 600000,
        fee: '0.000005 SOL',
        lamports: 1000000,
        network: 'Mainnet',
        receiver: 'Hd3f3kL9mP2qR3bD4nE5fG6hJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8g',
        sender: '24x5yL3bD5mN6oP7qR8sT9uV0wX1yZ2aB3cD4eF5gH6jK7lM8nO9pQ0rS1t',
    },
};