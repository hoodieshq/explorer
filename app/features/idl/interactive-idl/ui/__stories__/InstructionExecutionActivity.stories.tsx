import { baseLogs, errorLogs } from '@entities/program-logs/model/mocks/logs';
import { parsedBaseLogs, parsedErrorLogs } from '@entities/program-logs/model/mocks/parsedLogs';
import type { Meta, StoryObj } from '@storybook/react';
import { withCluster } from '@storybook-config/decorators';

import { InstructionExecutionActivity } from '../InstructionActivity';

const FINISHED_AT = new Date('2026-01-01T00:00:00Z');
const SIGNATURE = '5Qg2cXabc123signaturePlaceholderForStorybookRenderingABCDEFGHJKLMN';
const SERIALIZED = 'AQABAgIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAh';

const meta = {
    component: InstructionExecutionActivity,
    decorators: [withCluster],
    globals: { viewport: { value: 'responsive' } },
    tags: ['autodocs'],
    title: 'Features/IDL/Interactive IDL/UI/InstructionExecutionActivity',
} satisfies Meta<typeof InstructionExecutionActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No result yet — only the empty Program logs tab renders. */
export const Empty: Story = {
    args: {
        parseLogs: () => [],
    },
};

/** Successful execution — Success status header with a tx link. */
export const Success: Story = {
    args: {
        lastResult: {
            finishedAt: FINISHED_AT,
            logs: baseLogs,
            signature: SIGNATURE,
            status: 'success',
        },
        parseLogs: () => parsedBaseLogs,
    },
};

/** Tx was broadcast but failed on-chain — Error status header with a tx link. */
export const BroadcastFailed: Story = {
    args: {
        lastResult: {
            finishedAt: FINISHED_AT,
            logs: errorLogs,
            message: 'custom program error: 0x0',
            phase: 'broadcast_failed',
            serializedTxMessage: SERIALIZED,
            signature: SIGNATURE,
            status: 'error',
        },
        parseLogs: () => parsedErrorLogs,
    },
};

/** Local failure before broadcast, with a serialized message — error note + inspector link. */
export const PreBroadcastFailedWithInspector: Story = {
    args: {
        lastResult: {
            finishedAt: FINISHED_AT,
            logs: errorLogs,
            message: 'Wallet rejected the transaction',
            phase: 'pre_broadcast_failed',
            serializedTxMessage: SERIALIZED,
            status: 'error',
        },
        parseLogs: () => parsedErrorLogs,
    },
};

/** Local failure before a tx could be built — error note, no link. */
export const PreBroadcastFailedNoLink: Story = {
    args: {
        lastResult: {
            finishedAt: FINISHED_AT,
            logs: errorLogs,
            message: 'Failed to build transaction',
            phase: 'pre_broadcast_failed',
            serializedTxMessage: undefined,
            status: 'error',
        },
        parseLogs: () => parsedErrorLogs,
    },
};
