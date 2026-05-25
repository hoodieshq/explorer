import type { Meta, StoryObj } from '@storybook/react';

import { SimulationSuccessStatus } from '../SimulationSuccessStatus';

const meta = {
    component: SimulationSuccessStatus,
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
    title: 'Entities/Program Logs/UI/SimulationSuccessStatus',
} satisfies Meta<typeof SimulationSuccessStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        date: new Date('2024-01-15T10:30:00Z'),
        unitsConsumed: 123_456,
    },
};

export const NoUnits: Story = {
    args: {
        date: new Date('2024-01-15T10:30:00Z'),
        unitsConsumed: undefined,
    },
};
