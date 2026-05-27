'use client';

import { useParsedLogs } from '@entities/program-logs';
import { type Commitment, type Connection, PublicKey, type Transaction, VersionedTransaction } from '@solana/web3.js';
import { useCallback, useState } from 'react';

import { Logger } from '@/app/shared/lib/logger';

import type { BaseIdl } from '../unified-program';
import { formatTransactionError } from './format-transaction-error';
import { serializeTransactionMessage, toBase64TransactionMessage } from './serialize-transaction-message';
import type { InstructionSimulationResult } from './types';

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
    const [lastSimulation, setLastSimulation] = useState<InstructionSimulationResult | null>(null);

    const simulate = useCallback(
        async (buildTx: () => Promise<Transaction>): Promise<void> => {
            setIsSimulating(true);
            setLastSimulation(null);
            let transaction: Transaction | undefined;
            let serializedTxMessage: string | null = null;
            try {
                transaction = await buildTx();
                if (!transaction.recentBlockhash) {
                    const { blockhash } = await connection.getLatestBlockhash();
                    transaction.recentBlockhash = blockhash;
                }
                serializedTxMessage = toBase64TransactionMessage(transaction);
                const result = await connection.simulateTransaction(
                    new VersionedTransaction(transaction.compileMessage()),
                    {
                        commitment: simulationCommitment,
                    },
                );
                const logs = result.value.logs ?? [];
                if (result.value.err !== null) {
                    setLastSimulation({
                        finishedAt: new Date(),
                        logs,
                        message: formatTransactionError(result.value.err, idlErrors),
                        serializedTxMessage,
                        status: 'error',
                    });
                    return;
                }
                setLastSimulation({
                    finishedAt: new Date(),
                    logs,
                    returnData: result.value.returnData ?? null,
                    serializedTxMessage,
                    status: 'success',
                    unitsConsumed: result.value.unitsConsumed,
                });
            } catch (e) {
                Logger.error(e, { transaction });
                setLastSimulation({
                    finishedAt: new Date(),
                    message: e instanceof Error ? e.message : 'Simulation failed',
                    phase: 'simulation_execution_failed',
                    serializedTxMessage,
                    status: 'error',
                });
            } finally {
                setIsSimulating(false);
            }
        },
        [connection, simulationCommitment, idlErrors],
    );

    const reset = useCallback(() => setLastSimulation(null), []);

    return { isSimulating, lastSimulation, parseLogs, reset, simulate };
}
