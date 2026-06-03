import { baseLogs, errorLogs } from '@entities/program-logs/model/mocks/logs';
import { parsedBaseLogs, parsedErrorLogs } from '@entities/program-logs/model/mocks/parsedLogs';
import type { Meta, StoryObj } from '@storybook/react';
import { withCluster } from '@storybook-config/decorators';

import { InstructionSimulationActivity } from '../InstructionActivity';

const FINISHED_AT = new Date('2026-01-01T00:00:00Z');
const SERIALIZED = 'AQABAgIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAh';

const meta = {
    component: InstructionSimulationActivity,
    decorators: [
        withCluster,
        Story => (
            <div className="e-flex e-h-[500px] e-w-[800px] e-flex-col">
                <Story />
            </div>
        ),
    ],
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    title: 'Features/IDL/Interactive IDL/UI/InstructionSimulationActivity',
} satisfies Meta<typeof InstructionSimulationActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No simulation yet — only the empty Program logs tab renders. */
export const Empty: Story = {
    args: {
        parseLogs: () => [],
    },
};

/** Successful simulation — Simulated status header with compute units and inspector link. */
export const Success: Story = {
    args: {
        lastSimulation: {
            finishedAt: FINISHED_AT,
            logs: baseLogs,
            returnData: undefined,
            serializedTxMessage: SERIALIZED,
            status: 'success',
            unitsConsumed: 7617,
        },
        parseLogs: () => parsedBaseLogs,
    },
};

/** RPC simulation returned an error — Simulation Error header with inspector link. */
export const RpcSimulationFailed: Story = {
    args: {
        lastSimulation: {
            finishedAt: FINISHED_AT,
            logs: errorLogs,
            message: 'custom program error: 0x0',
            phase: 'rpc_simulation_failed',
            serializedTxMessage: SERIALIZED,
            status: 'error',
        },
        parseLogs: () => parsedErrorLogs,
    },
};

/** Local failure before/during the simulate call, no serialized message — error note, no link. */
export const ExecutionFailedNoLink: Story = {
    args: {
        lastSimulation: {
            finishedAt: FINISHED_AT,
            message: 'Failed to fetch latest blockhash',
            phase: 'simulation_execution_failed',
            serializedTxMessage: undefined,
            status: 'error',
        },
        parseLogs: () => [],
    },
};
