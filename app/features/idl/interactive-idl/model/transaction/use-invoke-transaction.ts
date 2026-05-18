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
import { formatTransactionError } from './format-transaction-error';
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
    const { handleTxEnd, handleTxError, handleTxStart, handleTxSuccess, isExecuting, lastResult, parseLogs } =
        useInvocationState({ onError, onSuccess });

    const invoke = useCallback(
        async (buildTx: () => Promise<Transaction>): Promise<void> => {
            if (!connected || !publicKey || !signTransaction) {
                const message = 'Wallet not connected';
                setPreInvocationError(message);
                onPreInvocationError?.(message);
                return;
            }
            setPreInvocationError(null);
            handleTxStart();
            let transaction: Transaction | undefined;
            try {
                transaction = await buildTx();
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
                    handleTxError(confirmed.value.err, transaction, {
                        idlErrors,
                        logs: finalLogs,
                    });
                    return;
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
        ],
    );

    return { invoke, isExecuting, lastResult, parseLogs, preInvocationError };
}

type HandleTxErrorOptions = {
    idlErrors?: BaseIdl['errors'];
    logs?: string[];
};

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

    const handleTxError = (
        error: unknown,
        transaction: Transaction | undefined,
        options: HandleTxErrorOptions = {},
    ) => {
        if (error instanceof Error) {
            Logger.error(error, { transaction });
            const message = error.message || 'Failed to invoke instruction';
            setLastError({ finishedAt: new Date(), message });
            // SendTransactionError can still surface from low-level RPC issues even with skipPreflight=true.
            if (error instanceof SendTransactionError) {
                setLogs(error.logs ?? []);
                setTransactionError(error);
            }
            setSerializedTxMessage(serializeTransactionMessage(transaction));
            onError?.(message);
            return;
        }

        const txError = error as TransactionError;
        const message = formatTransactionError(txError, options.idlErrors);
        Logger.error(new Error(message), { transaction });
        setLastError({ finishedAt: new Date(), message });
        setLogs(options.logs ?? []);
        setTransactionError(txError);
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
    };
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
