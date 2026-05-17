'use client';

import { useParsedLogs } from '@entities/program-logs';
import { type Commitment, type Connection, PublicKey, type Transaction } from '@solana/web3.js';
import { useCallback, useState } from 'react';

import { Logger } from '@/app/shared/lib/logger';

import type { BaseIdl } from '../unified-program';
import { assertSimulationOk, simulateTransaction } from './simulate-transaction';
import type { SimulationResult } from './types';

// Any base58 32-byte value works as a placeholder when replaceRecentBlockhash=true.
const PLACEHOLDER_BLOCKHASH = PublicKey.default.toBase58();

export function useSimulateTransaction(opts: {
    connection: Connection;
    simulationCommitment: Commitment;
    idlErrors?: BaseIdl['errors'];
}) {
    const { connection, simulationCommitment, idlErrors } = opts;
    const { parseLogs } = useParsedLogs(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [lastSimulation, setLastSimulation] = useState<SimulationResult>(null);

    const simulate = useCallback(
        async (transaction: Transaction): Promise<void> => {
            setIsSimulating(true);
            setLastSimulation(null);
            try {
                if (!transaction.recentBlockhash) {
                    transaction.recentBlockhash = PLACEHOLDER_BLOCKHASH;
                }
                const result = await simulateTransaction(connection, transaction, {
                    commitment: simulationCommitment,
                    replaceRecentBlockhash: true,
                    sigVerify: false,
                });
                const logs = result.value.logs ?? [];
                if (result.value.err !== null) {
                    try {
                        assertSimulationOk(result.value.err, idlErrors);
                    } catch (e) {
                        setLastSimulation({
                            finishedAt: new Date(),
                            logs,
                            message: (e as Error).message,
                            status: 'error',
                        });
                        return;
                    }
                }
                setLastSimulation({
                    finishedAt: new Date(),
                    logs,
                    returnData: result.value.returnData ?? null,
                    status: 'success',
                    unitsConsumed: result.value.unitsConsumed,
                });
            } catch (e) {
                Logger.error(e as Error);
                setLastSimulation({
                    finishedAt: new Date(),
                    logs: [],
                    message: (e as Error).message ?? 'Simulation failed',
                    status: 'error',
                });
            } finally {
                setIsSimulating(false);
            }
        },
        [connection, simulationCommitment, idlErrors],
    );

    const reportError = useCallback((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setLastSimulation({ finishedAt: new Date(), logs: [], message, status: 'error' });
    }, []);

    const reset = useCallback(() => setLastSimulation(null), []);

    return { isSimulating, lastSimulation, parseLogs, reportError, reset, simulate };
}
