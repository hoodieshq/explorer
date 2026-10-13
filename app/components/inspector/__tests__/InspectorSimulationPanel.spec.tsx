import type { TransactionVersion } from '@explorer/parsers/transaction';
import { VersionedMessage } from '@solana/web3.js';
import { render } from '@testing-library/react';
import type { InstructionLogs } from '@utils/program-logs';
import { describe, expect, it, vi } from 'vitest';

import { createWeb3TransactionBytes } from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import type { SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

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
    it('should pass its version prop to the CU profiling card', () => {
        const message = VersionedMessage.deserialize(parseTransactionBytes(createWeb3TransactionBytes(0)).messageBytes);

        render(<InspectorSimulationPanel simulation={DONE} message={message} version={1} />);

        expect(BaseSimulatorCUProfilingCard.mock.lastCall?.[0]).toMatchObject({ transactionVersion: 1 });
    });
});
