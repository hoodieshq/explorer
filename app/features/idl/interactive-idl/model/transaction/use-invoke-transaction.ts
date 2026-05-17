'use client';

import { useParsedLogs } from '@entities/program-logs';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    type Commitment,
    type Connection,
    type Finality,
    type RpcResponseAndContext,
    SendTransactionError,
    type SimulatedTransactionResponse,
    type Transaction,
    type TransactionError,
} from '@solana/web3.js';
import { useCallback, useState } from 'react';

import { toBase64 } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';

import type { BaseIdl } from '../unified-program';
import { assertSimulationOk, simulateTransaction } from './simulate-transaction';
import type { InstructionInvocationResult } from './types';

export function useInvokeTransaction(opts: {
    connection: Connection;
    commitment: Finality;
    simulationCommitment: Commitment;
    idlErrors?: BaseIdl['errors'];
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    onPreInvocationError?: (error: string) => void;
}) {
    const { connection, commitment, simulationCommitment, idlErrors, onSuccess, onError, onPreInvocationError } = opts;
    const { connected, publicKey, signTransaction } = useWallet();
    const [preInvocationError, setPreInvocationError] = useState<string | null>(null);
    const {
        handleSimulatedTxResult,
        handleTxEnd,
        handleTxError,
        handleTxStart,
        handleTxSuccess,
        isExecuting,
        lastResult,
        parseLogs,
    } = useInvocationState({ idlErrors, onError, onSuccess });

    const invoke = useCallback(
        async (transaction: Transaction): Promise<void> => {
            if (!connected || !publicKey || !signTransaction) {
                const message = 'Wallet not connected';
                setPreInvocationError(message);
                onPreInvocationError?.(message);
                return;
            }
            setPreInvocationError(null);
            handleTxStart();
            try {
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;

                const simulated = await simulateTransaction(connection, transaction, {
                    commitment: simulationCommitment,
                });
                handleSimulatedTxResult(simulated);

                const signed = await signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signed.serialize(), {
                    skipPreflight: false,
                });
                const confirmed = await connection.confirmTransaction(
                    { blockhash, lastValidBlockHeight, signature },
                    commitment,
                );
                if (confirmed.value?.err) {
                    throw new Error('Transaction was not confirmed');
                }

                const published = await connection.getTransaction(signature, {
                    commitment,
                    maxSupportedTransactionVersion: 0,
                });
                handleTxSuccess(signature, published?.meta?.logMessages);
            } catch (error) {
                handleTxError(error, transaction);
            } finally {
                handleTxEnd();
            }
        },
        [
            connected,
            publicKey,
            signTransaction,
            connection,
            commitment,
            simulationCommitment,
            handleTxStart,
            handleSimulatedTxResult,
            handleTxSuccess,
            handleTxError,
            handleTxEnd,
            onPreInvocationError,
        ],
    );

    const reportError = useCallback(
        (error: unknown) => {
            handleTxStart();
            handleTxError(error, undefined);
            handleTxEnd();
        },
        [handleTxStart, handleTxError, handleTxEnd],
    );

    return { invoke, isExecuting, lastResult, parseLogs, preInvocationError, reportError };
}

function useInvocationState({
    onSuccess,
    onError,
    idlErrors,
}: {
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    idlErrors?: BaseIdl['errors'];
}) {
    const [transactionError, setTransactionError] = useState<TransactionError | null>(null);
    const { parseLogs } = useParsedLogs(transactionError);
    const [serializedTxMessage, setSerializedTxMessage] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastError, setLastError] = useState<{ finishedAt: Date; message: string } | null>(null);
    const [lastSuccess, setLastSuccess] = useState<{ finishedAt: Date; signature: string } | null>(null);

    const handleLogsChange = (next: string[] | null | undefined) => {
        if (!next) return;
        setLogs(next);
    };

    const handleTxStart = () => {
        setIsExecuting(true);
        setLastError(null);
        setLastSuccess(null);
        setLogs([]);
        setTransactionError(null);
        setSerializedTxMessage(null);
    };

    const handleTxSuccess = (signature: string, finalLogs: string[] | null | undefined) => {
        setLastSuccess({ finishedAt: new Date(), signature });
        handleLogsChange(finalLogs);
        onSuccess?.(signature);
    };

    const handleTxError = (error: unknown, transaction: Transaction | undefined) => {
        Logger.error(error as Error, { transaction });
        const message = computeErrorMessage(error);
        setLastError({ finishedAt: new Date(), message });
        if (error instanceof SendTransactionError) {
            setLogs(error.logs ?? []);
            setTransactionError(error);
        }
        setSerializedTxMessage(serializeTransactionMessage(transaction));
        onError?.(message);
    };

    const handleTxEnd = () => {
        setIsExecuting(false);
    };

    const handleSimulatedTxResult = (simulated: RpcResponseAndContext<SimulatedTransactionResponse>) => {
        if (simulated.value.err === null) return;
        handleLogsChange(simulated.value.logs);
        assertSimulationOk(simulated.value.err, idlErrors);
    };

    const lastResult: InstructionInvocationResult = lastSuccess
        ? { finishedAt: lastSuccess.finishedAt, logs, signature: lastSuccess.signature, status: 'success' }
        : lastError
          ? {
                finishedAt: lastError.finishedAt,
                logs,
                message: lastError.message,
                serializedTxMessage,
                status: 'error',
            }
          : null;

    return {
        handleSimulatedTxResult,
        handleTxEnd,
        handleTxError,
        handleTxStart,
        handleTxSuccess,
        isExecuting,
        lastResult,
        parseLogs,
    };
}

function computeErrorMessage(error: unknown, fallback = 'Failed to invoke instruction'): string {
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes('simulation failed')) {
            return 'Simulation failed. See logs for details.';
        }
        return error.message;
    }
    return fallback;
}

function serializeTransactionMessage(transaction: Transaction | undefined): string | null {
    if (!transaction) return null;
    try {
        return toBase64(transaction.serializeMessage());
    } catch (error) {
        Logger.warn('[idl] Failed to serialize transaction message', { error });
        return null;
    }
}
