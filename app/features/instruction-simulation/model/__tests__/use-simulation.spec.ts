// @vitest-environment jsdom

import { fromMessageBytes } from '@explorer/parsers/transaction';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { swrWrapper } from '@/app/__tests__/swr-hook';
import { createWeb3TransactionBytes } from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

import type { SimulationResult } from '../../lib/simulate-transaction';
import { type SimulationState, useSimulation } from '../use-simulation';

const MOCK_URL = 'https://devnet.rpc.address';
const MESSAGE_BYTES = new Uint8Array([1, 2, 3]);

vi.mock('@providers/cluster', () => ({
    useCluster: () => ({ cluster: 'devnet', url: MOCK_URL }),
}));

const mockSimulateTransaction = vi.fn();
vi.mock('../../lib/simulate-transaction', () => ({
    simulateTransaction: (...args: unknown[]) => mockSimulateTransaction(...args),
}));

describe('useSimulation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSimulateTransaction.mockResolvedValue(createSuccessResult());
    });

    it('should return idle status before simulation', () => {
        const { result } = renderHook(() => useSimulation(MESSAGE_BYTES), { wrapper: swrWrapper() });

        expect(result.current.status).toBe('idle');
        expect(typeof getSimulate(result.current)).toBe('function');
    });

    it('should transition to done with result on success', async () => {
        const successResult = createSuccessResult({ epoch: 42n, unitsConsumed: 200 });
        mockSimulateTransaction.mockResolvedValue(successResult);

        const { result } = renderHook(() => useSimulation(MESSAGE_BYTES), { wrapper: swrWrapper() });

        await act(async () => {
            getSimulate(result.current)();
        });

        expect(result.current).toMatchObject({
            result: { epoch: 42n, unitsConsumed: 200 },
            status: 'done',
        });
    });

    it('should transition to error when simulateTransaction rejects', async () => {
        mockSimulateTransaction.mockRejectedValue(new Error('Network timeout'));

        const { result } = renderHook(() => useSimulation(MESSAGE_BYTES), { wrapper: swrWrapper() });

        await act(async () => {
            getSimulate(result.current)();
        });

        expect(result.current).toMatchObject({ error: 'Network timeout', status: 'error' });
    });

    it('should not trigger simulation again while already simulating', async () => {
        let resolveSimulation: (value: SimulationResult) => void;
        mockSimulateTransaction.mockImplementation(
            () =>
                new Promise(resolve => {
                    resolveSimulation = resolve;
                }),
        );

        const { result } = renderHook(() => useSimulation(MESSAGE_BYTES), { wrapper: swrWrapper() });

        await act(async () => {
            getSimulate(result.current)();
        });

        expect(result.current.status).toBe('simulating');
        expect(mockSimulateTransaction).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveSimulation(createSuccessResult());
        });
    });
});

function getSimulate(state: SimulationState): () => void {
    if (state.status === 'simulating') throw new Error('simulate not available while simulating');
    return state.simulate;
}

function createSuccessResult(overrides?: Partial<SimulationResult>): SimulationResult {
    return {
        epoch: 100n,
        error: undefined,
        logs: [],
        solBalanceChanges: undefined,
        tokenBalanceData: undefined,
        transaction: fromMessageBytes(parseTransactionBytes(createWeb3TransactionBytes('legacy')).messageBytes),
        unitsConsumed: 150,
        ...overrides,
    };
}
