'use client';

import { useParsedLogs } from '@entities/program-logs';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    type Connection,
    type Finality,
    SendTransactionError,
    type Transaction,
    type TransactionError,
} from '@solana/web3.js';
import { useCallback, useState } from 'react';

import { toBase64 } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';

import type { BaseIdl } from '../unified-program';
import { assertSimulationOk } from './simulate-transaction';
import type { InstructionInvocationResult } from './types';

export function useInvokeTransaction(opts: {
    connection: Connection;
    commitment: Finality;
    idlErrors?: BaseIdl['errors'];
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    onPreInvocationError?: (error: string) => void;
}) {
    const { connection, commitment, idlErrors, onSuccess, onError, onPreInvocationError } = opts;
    const { connected, publicKey, signTransaction } = useWallet();
    const [preInvocationError, setPreInvocationError] = useState<string | null>(null);
    const {
        handleTxEnd,
        handleTxError,
        handleTxStart,
        handleTxSuccess,
        isExecuting,
        lastResult,
        parseLogs,
        setLogs,
        setTransactionError,
    } = useInvocationState({ onError, onSuccess });

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

                const signed = await signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signed.serialize(), {
                    skipPreflight: true,
                });
                const confirmed = await connection.confirmTransaction(
                    { blockhash, lastValidBlockHeight, signature },
                    commitment,
                );
                const published = await connection.getTransaction(signature, {
                    commitment,
                    maxSupportedTransactionVersion: 0,
                });
                const finalLogs = published?.meta?.logMessages ?? [];

                if (confirmed.value?.err) {
                    setLogs(finalLogs);
                    setTransactionError(confirmed.value.err);
                    assertSimulationOk(confirmed.value.err, idlErrors);
                }

                handleTxSuccess(signature, finalLogs);
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
            idlErrors,
            handleTxStart,
            handleTxSuccess,
            handleTxError,
            handleTxEnd,
            onPreInvocationError,
            setLogs,
            setTransactionError,
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
}: {
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
}) {
    const [transactionError, setTransactionError] = useState<TransactionError | null>(null);
    const { parseLogs } = useParsedLogs(transactionError);
    const [serializedTxMessage, setSerializedTxMessage] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastError, setLastError] = useState<{ finishedAt: Date; message: string } | null>(null);
    const [lastSuccess, setLastSuccess] = useState<{ finishedAt: Date; signature: string } | null>(null);

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
        if (finalLogs) setLogs(finalLogs);
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
        handleTxEnd,
        handleTxError,
        handleTxStart,
        handleTxSuccess,
        isExecuting,
        lastResult,
        parseLogs,
        setLogs,
        setTransactionError,
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
