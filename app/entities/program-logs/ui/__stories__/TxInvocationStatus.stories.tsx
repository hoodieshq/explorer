import type { Meta, StoryObj } from '@storybook/react';

import { TxInvocationStatus } from '../TxInvocationStatus';

const meta = {
    component: TxInvocationStatus,
    decorators: [
        Story => (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    maxWidth: '100%',
                    width: '800px',
                }}
            >
                <Story />
            </div>
        ),
    ],
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    title: 'Entities/Program Logs/UI/TxInvocationStatus',
} satisfies Meta<typeof TxInvocationStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

export const Success: Story = {
    args: {
        date: new Date('2024-01-15T10:30:00Z'),
        link: `/tx/${signature}`,
        signature,
        status: 'success',
    },
};

export const Error: Story = {
    args: {
        date: new Date('2024-01-15T10:30:00Z'),
        link: `/tx/${signature}`,
        signature,
        status: 'error',
    },
};
