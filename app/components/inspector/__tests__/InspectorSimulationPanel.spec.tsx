import { fromMessageBytes, type ParsedTransaction } from '@explorer/parsers/transaction';
import { render, screen } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    createV1TransactionBytes,
    createWeb3TransactionBytes,
} from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import type { SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

const { CUProfilingCard } = vi.hoisted(() => ({
    CUProfilingCard: vi.fn<(props: Record<string, unknown>) => null>(() => null),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/tx/inspector',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@providers/cluster', async importOriginal => ({
    ...(await importOriginal<typeof import('@providers/cluster')>()),
    useCluster: () => ({ cluster: Cluster.MainnetBeta, url: 'https://api.mainnet-beta.solana.com' }),
}));
vi.mock('@entities/idl', async importOriginal => ({
    ...(await importOriginal<typeof import('@entities/idl')>()),
    useAnchorProgram: () => ({ idl: null, isLoading: false, program: null }),
}));
vi.mock('@entities/idl/@x/transaction-data', () => ({ useProgramIdlNames: () => new Map() }));
vi.mock('@/app/features/instruction-simulation/ui/BaseSimulatorCUProfilingCard', () => ({
    BaseSimulatorCUProfilingCard: CUProfilingCard,
}));

import { InspectorSimulationPanel } from '../InspectorSimulationPanel';

const LOG_TEXT = 'Program log: simulated';

function simulationOf(transaction: ParsedTransaction): SimulationState {
    return {
        result: {
            epoch: 0n,
            error: undefined,
            logs: [
                {
                    computeUnits: 150,
                    failed: false,
                    invokedProgram: transaction.instructions[0].programAddress,
                    logs: [{ prefix: '> ', style: 'muted', text: LOG_TEXT }],
                    truncated: false,
                },
            ],
            solBalanceChanges: undefined,
            tokenBalanceData: undefined,
            transaction,
            unitsConsumed: 150,
        },
        simulate: vi.fn(),
        status: 'done',
    };
}

afterEach(() => vi.clearAllMocks());

describe('InspectorSimulationPanel', () => {
    it.each([
        { label: 'v1', messageBytes: parseTransactionBytes(createV1TransactionBytes({})).messageBytes, version: 1 },
        {
            label: 'legacy',
            messageBytes: parseTransactionBytes(createWeb3TransactionBytes('legacy')).messageBytes,
            version: 'legacy',
        },
    ] as const)('should render a finished $label simulation from its transaction', ({ messageBytes, version }) => {
        const transaction = fromMessageBytes(messageBytes);

        render(<InspectorSimulationPanel simulation={simulationOf(transaction)} />);

        expect(screen.getByText(LOG_TEXT)).toBeInTheDocument();
        expect(CUProfilingCard.mock.lastCall?.[0]).toMatchObject({
            instructions: [{ programId: transaction.instructions[0].programAddress }],
            transactionVersion: version,
        });
    });
});
