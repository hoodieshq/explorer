'use client';

import type { InstructionData } from '@entities/idl/formatters/formatted-idl';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    Connection,
    PublicKey,
    SendTransactionError,
    Transaction,
    TransactionError,
    TransactionInstruction,
} from '@solana/web3.js';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCluster } from '@/app/providers/cluster';
import { clusterUrl } from '@/app/utils/cluster';

import { programAtom } from '../model/state-atoms';
import { IdlExecutor, populateAccounts, populateArguments } from './idl-executor';
import type { UnifiedWallet } from './unified-program';
import { BaseIdl } from './unified-program';

interface UseInstructionOptions {
    programId?: string;
    cluster?: string;
    idl?: BaseIdl;
    enabled?: boolean;
    interpreterName?: 'anchor';
}

interface UseInstructionReturn {
    // Execution
    invokeInstruction: (
        instructionName: string,
        instruction: InstructionData,
        params: {
            accounts: any;
            arguments: Record<string, string>;
        }
    ) => Promise<string | null>;

    // Validation helpers
    validateInstruction: (
        instructionName: string,
        instruction: InstructionData
    ) => { isValid: boolean; errors: string[] };

    // Status
    isExecuting: boolean;
    lastError: string | null;
    lastSuccess: string | null;
    logs: string[];
    transactionError: TransactionError | null;
    initializeProgram: () => void;
    isProgramLoading: boolean;
    program: any;
    initializationError: string | null;
}

export function useInstruction({
    programId: pid,
    cluster,
    idl,
    enabled = true,
    interpreterName = 'anchor',
}: UseInstructionOptions): UseInstructionReturn {
    const { connected, publicKey, ...wallet } = useWallet();
    const { cluster: currentCluster, customUrl } = useCluster();
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [lastSuccess, setLastSuccess] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [transactionError, setTransactionError] = useState<TransactionError | null>(null);
    const [initializationError, setInitializationError] = useState<string | null>(null);
    const [isProgramLoading, setIsProgramLoading] = useState(false);
    const [program, setProgram] = useAtom(programAtom);

    const programId = useMemo(() => (pid ? new PublicKey(pid) : undefined), [pid]);

    // Get connection for the specified cluster
    const connection = useMemo(() => {
        const endpoint = cluster || clusterUrl(currentCluster, customUrl);
        return new Connection(endpoint);
    }, [cluster, currentCluster, customUrl]);

    /// Allow to create Executor instance and update cluster-dependent connection
    const executorRef = useRef<IdlExecutor>();
    const executor = useMemo(() => {
        if (!executorRef.current) {
            executorRef.current = new IdlExecutor({ connection });
        }
        return executorRef.current;
    }, [connection]);

    const unifiedWallet = useMemo<UnifiedWallet | undefined>(() => {
        if (!publicKey) return undefined;
        return {
            publicKey,
            signAllTransactions:
                wallet.signAllTransactions ||
                (async () => {
                    throw new Error('Wallet not connected');
                }),
            signTransaction:
                wallet.signTransaction ||
                (async () => {
                    throw new Error('Wallet not connected');
                }),
        };
    }, [publicKey, wallet.signAllTransactions, wallet.signTransaction]);

    const initializeProgram = useCallback(async () => {
        // Don't throw if wallet is missing, just skip initialization
        // It will be initialized when wallet becomes available
        if (!enabled || !idl || !programId || !unifiedWallet) {
            return;
        }

        setIsProgramLoading(true);
        setInitializationError(null);

        try {
            const p = await executor.initializeProgram(idl, programId, unifiedWallet, interpreterName);
            setProgram(p);
            setInitializationError(null);
        } catch (error) {
            const errorMessage = handleInitializeError(error);

            console.error('Program initialization failed:', errorMessage);
            setInitializationError(errorMessage);
            setProgram(undefined);
        } finally {
            setIsProgramLoading(false);
        }
    }, [enabled, idl, programId, executor, unifiedWallet, interpreterName, setProgram]);

    // TODO: move to separate effect
    // Track initialization key to prevent re-runs
    const initKeyRef = useRef<string>('');
    // Single effect to handle initialization
    useEffect(() => {
        const initKey = `${enabled}-${!!idl}-${programId?.toString()}-${publicKey?.toString()}`;

        if (!enabled) {
            // Clear when disabled
            if (program) {
                setProgram(undefined);
                setInitializationError(null);
                setIsProgramLoading(false);
            }
            initKeyRef.current = '';
            return;
        }

        // Check if we should initialize
        // Initialize when wallet becomes available and we haven't tried with this key yet
        const shouldInit = enabled && idl && programId && unifiedWallet && !program && !isProgramLoading;

        if (shouldInit) {
            // Only initialize if the key has changed (prevents re-runs)
            if (initKeyRef.current !== initKey) {
                initKeyRef.current = initKey;
                initializeProgram();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, idl, programId, publicKey, unifiedWallet, program, isProgramLoading, setProgram]);

    // Clear program when key dependencies change to ensure fresh initialization
    useEffect(() => {
        if (program) {
            setProgram(undefined);
            setInitializationError(null);
            initKeyRef.current = '';
        }
    }, [idl, programId?.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

    // Validation helper to check if an instruction is ready to execute
    const validateInstruction = useCallback((_instructionName: string, _instruction: InstructionData) => {
        const errors: string[] = [];

        return {
            errors,
            isValid: errors.length === 0,
        };
    }, []);

    // Main function to invoke an instruction
    const invokeInstruction = useCallback(
        async (
            instructionName: string,
            instruction: InstructionData,
            params: {
                accounts: any;
                arguments: Record<string, string>;
            }
        ): Promise<string | null> => {
            if (!connected || !publicKey || !wallet.signTransaction) {
                setLastError('Wallet not connected');
                return null;
            }

            setIsExecuting(true);
            setLastError(null);
            setLastSuccess(null);
            setLogs([]);
            setTransactionError(null);

            try {
                if (!idl) throw new Error('Idl is absent');
                if (!program) throw new Error('Program is not initialized');
                if (!wallet) throw new Error('Wallet is not initialized');

                const ixAccounts = populateAccounts(params.accounts, instructionName);
                const ixArguments = populateArguments(params.arguments, instructionName);

                const ix = await executor.getInstruction(
                    program,
                    instructionName,
                    ixAccounts,
                    ixArguments,
                    idl,
                    interpreterName
                );

                let transaction: Transaction;
                if (ix instanceof TransactionInstruction) {
                    // Create and sign transaction
                    transaction = new Transaction().add(ix);
                } else {
                    throw new Error('Unsuported instruction format');
                }

                // TODO: move tx out of use instruction and impement a transaction provider
                // Get recent blockhash
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = publicKey;

                // Sign the transaction
                const signedTransaction = await wallet.signTransaction(transaction);

                const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                    preflightCommitment: 'confirmed',
                    skipPreflight: false,
                });

                const confirmed = await connection.confirmTransaction(
                    {
                        blockhash,
                        lastValidBlockHeight,
                        signature,
                    },
                    'confirmed'
                );

                if (confirmed.value?.err) {
                    throw new Error('Transaction was not confirmed');
                }

                const publishedTransaction = await connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                });

                if (publishedTransaction?.meta?.logMessages) {
                    setLogs(publishedTransaction?.meta?.logMessages);
                }

                setLastSuccess(signature);
                return signature;
            } catch (error) {
                const errorMessage = handleInvokeError(error);
                setLastError(errorMessage);
                if (error instanceof SendTransactionError) {
                    setLogs(error.logs ?? []);
                    setTransactionError(error);
                }
                console.error('Instruction execution failed:', error);
                return null;
            } finally {
                setIsExecuting(false);
            }
        },
        [connected, publicKey, wallet, connection, idl, executor, program, interpreterName]
    );

    return {
        initializationError,
        initializeProgram,
        invokeInstruction,
        isExecuting,
        isProgramLoading,
        lastError,
        lastSuccess,
        logs,
        program,
        transactionError,
        validateInstruction,
    };
}

export const isEnabled = ({
    idl,
    programId,
    publicKey,
    connected,
}: {
    idl: any;
    programId?: PublicKey | string | null;
    publicKey: PublicKey | null;
    connected: boolean;
}): boolean => {
    return Boolean(idl && programId && publicKey && connected === true);
};

function handleInitializeError(error: unknown | Error, message = 'Failed to initialize program') {
    let errorMessage = message;
    if (error instanceof Error) {
        // Provide more specific error messages for common issues
        if (error.message.toLowerCase().includes('wallet')) {
            errorMessage = 'Wallet connection required for program initialization';
        } else if (error.message.toLowerCase().includes('idl')) {
            errorMessage = `IDL error: ${error.message}`;
        } else if (error.message.toLowerCase().includes('program')) {
            errorMessage = `Program error: ${error.message}`;
        } else {
            errorMessage = error.message;
        }
    }
    return errorMessage;
}

function handleInvokeError(error: unknown | Error, message = 'Failed to invoke instruction') {
    let errorMessage = message;
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes('simulation failed')) {
            errorMessage = 'Simulation failed. See logs for details.';
        } else {
            errorMessage = error.message;
        }
    }
    return errorMessage;
}
