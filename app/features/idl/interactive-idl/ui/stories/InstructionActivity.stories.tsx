import type { Meta, StoryObj } from '@storybook/react';

import { baseLogs, errorLogs } from '@/app/entities/program-logs/model/mocks/logs';
import { parsedBaseLogs, parsedErrorLogs } from '@/app/entities/program-logs/model/mocks/parsedLogs';

import { InstructionActivity } from '../InstructionActivity';

const meta = {
    component: InstructionActivity,
    decorators: [
        Story => (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '600px',
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
    title: 'Features/IDL/Interactive IDL/UI/InstructionActivity',
} satisfies Meta<typeof InstructionActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        logs: baseLogs,
        parseLogs: () => parsedBaseLogs,
    },
};

export const Error: Story = {
    args: {
        logs: errorLogs,
        parseLogs: () => parsedErrorLogs,
    },
};

export const Empty: Story = {
    args: {
        logs: [],
        parseLogs: () => [],
    },
};
