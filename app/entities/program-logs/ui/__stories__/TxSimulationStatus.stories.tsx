import type { Meta, StoryObj } from '@storybook/react';

import { TxSimulationStatus } from '../TxSimulationStatus';

const meta: Meta<typeof TxSimulationStatus> = {
    component: TxSimulationStatus,
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
    title: 'Entities/Program Logs/UI/TxSimulationStatus',
};

export default meta;
type Story = StoryObj<typeof TxSimulationStatus>;

const serializedMessage =
    'AQADByTPMvZ5NhbwY7GzM3bmF6aUB0Es9utyRgN3KoaqxFltNfKjDEAu3mQ7ldMPRzdZ2rwfown8mXJVsLSeFIoWPQObM34V';

export const Success: Story = {
    args: {
        date: new Date('2024-01-15T10:30:00Z'),
        link: `/tx/inspector?message=${serializedMessage}`,
        status: 'success',
        unitsConsumed: 123_456,
    },
};

export const SuccessNoUnits: Story = {
    args: {
        date: new Date('2024-01-15T10:30:00Z'),
        link: `/tx/inspector?message=${serializedMessage}`,
        status: 'success',
        unitsConsumed: undefined,
    },
};

export const Error: Story = {
    args: {
        date: new Date('2024-01-15T10:30:00Z'),
        link: `/tx/inspector?message=${serializedMessage}`,
        message: 'AccountNotFound: account does not exist or has no data',
        status: 'error',
    },
};

export const ErrorNoLink: Story = {
    args: {
        date: new Date('2024-01-15T10:30:00Z'),
        message: 'Simulation failed: wallet not connected',
        status: 'error',
    },
};
