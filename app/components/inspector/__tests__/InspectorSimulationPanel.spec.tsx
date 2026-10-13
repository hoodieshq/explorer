import type { TransactionVersion } from '@explorer/parsers/transaction';
import { render } from '@testing-library/react';
import type { InstructionLogs } from '@utils/program-logs';
import { describe, expect, it, vi } from 'vitest';

import { createV1TransactionBytes } from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import type { SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';
import { bridgeV1MessageBytes } from '@/app/shared/lib/v1-message-bridge';

import { InspectorSimulationPanel } from '../InspectorSimulationPanel';

const { BaseSimulatorCUProfilingCard } = vi.hoisted(() => ({
    BaseSimulatorCUProfilingCard: vi.fn<(props: { transactionVersion: TransactionVersion }) => null>(() => null),
}));

vi.mock('@providers/cluster', () => ({
    useCluster: () => ({ cluster: 0, url: 'http://localhost:8899' }),
}));
vi.mock('@/app/features/instruction-simulation/model/use-simulation-instruction-names', () => ({
    useSimulationInstructionNames: () => ({ instructions: [], unresolvable: false }),
}));
vi.mock('@/app/features/instruction-simulation/ui/BaseSimulatorCUProfilingCard', () => ({
    BaseSimulatorCUProfilingCard,
}));
vi.mock('@/app/components/ProgramLogsCardBody', () => ({
    ProgramLogsCardBody: () => null,
}));

const LOGS: InstructionLogs[] = [
    { computeUnits: 150, failed: false, invokedProgram: null, logs: [], truncated: false },
];

const DONE: SimulationState = {
    result: {
        accountKeys: [],
        epoch: 0n,
        error: undefined,
        logs: LOGS,
        solBalanceChanges: undefined,
        tokenBalanceData: undefined,
        unitsConsumed: 150,
    },
    simulate: () => undefined,
    status: 'done',
};

describe('InspectorSimulationPanel', () => {
    it('should pass the declared version to the CU profiling card, not the bridged message version', () => {
        const { message } = bridgeV1MessageBytes(parseTransactionBytes(createV1TransactionBytes({})).messageBytes);

        render(<InspectorSimulationPanel simulation={DONE} message={message} version={1} />);

        expect(message.version).toBe(0);
        expect(BaseSimulatorCUProfilingCard.mock.lastCall?.[0]).toMatchObject({ transactionVersion: 1 });
    });
});
