'use client';

import { Accounts, Idl as AnchorIdl, IdlAccounts, Program } from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    Connection,
    PublicKey,
    sendAndConfirmRawTransaction,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { InstructionData } from '@/app/components/account/idl/formatted-idl/formatters/FormattedIdl';
import { useCluster } from '@/app/providers/cluster';
import { clusterUrl } from '@/app/utils/cluster';

import { programAtom } from '../model/state-atoms';
import { IdlExecutor } from './idl-executor';
import { UnifiedProgram, UnifiedWallet } from './unified-program';
import { BaseIdl } from './unified-program';
import { populateAccounts, populateArguments } from './use-instruction-interact';

interface InstructionState {
    accounts: Record<string, string>;
    args: Record<string, string>;
}

interface UseInstructionOptions {
    programId?: string;
    cluster?: string;
    idl?: BaseIdl;
    enabled?: boolean;
}

interface UseInstructionReturn {
    // State management
    instructionState: Record<string, InstructionState>;

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
    isInitialized: boolean;
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
}: UseInstructionOptions): UseInstructionReturn {
    const { connected, publicKey, ...wallet } = useWallet();
    const { cluster: currentCluster, customUrl } = useCluster();
    const [instructionState, setInstructionState] = useState<Record<string, InstructionState>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initializationError, setInitializationError] = useState<string | null>(null);

    const interpreterName = 'anchor';

    const programId = useMemo(() => (pid ? new PublicKey(pid) : undefined), [pid]);

    const [program, setProgram] = useAtom(programAtom);

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

    // useEffect(() => {
    //     if (executor) {
    //         console.log('TODO: Update cluster');
    //         executor.setConnection(connection);
    //     }
    // }, [connection, executor]);

    const [isProgramLoading, setIsProgramLoading] = useState(false);

    const unifiedWallet = useMemo<UnifiedWallet>(
        () => ({
            publicKey,
            signTransaction:
                wallet.signTransaction ||
                (async tx => {
                    throw new Error('Wallet not connected');
                }),
            signAllTransactions:
                wallet.signAllTransactions ||
                (async txs => {
                    throw new Error('Wallet not connected');
                }),
        }),
        [publicKey, wallet]
    );

    // callback that keeps logic to create program instance
    const createProgram = useCallback(() => {
        console.log('Initialize');
        if (!idl || !programId) {
            throw new Error('IDL or Program ID is missing');
        }
        return executor.initializeProgram(idl, programId, unifiedWallet, interpreterName);
    }, [idl, programId, interpreterName, executor, unifiedWallet]);

    const initializeProgram = useCallback(async () => {
        if (!idl) {
            setProgram(undefined);
            setInitializationError(null);
            return;
        }

        // Check if already loading to prevent concurrent initializations
        setIsProgramLoading(prev => {
            if (prev) {
                console.log('Already initializing program, skipping...');
                return prev;
            }

            // Clear any previous errors before starting
            setInitializationError(null);

            createProgram()
                .then(p => {
                    setProgram(p);
                    setInitializationError(null);
                })
                .catch(error => {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to initialize program';
                    console.error('Program initialization failed:', errorMessage);
                    setInitializationError(errorMessage);
                    setProgram(undefined);
                })
                .finally(() => {
                    setIsProgramLoading(false);
                });

            return true;
        });
    }, [idl, createProgram, setProgram]);

    // Reset initialization error when IDL changes
    useEffect(() => {
        setInitializationError(null);
    }, [idl]);

    // Validation helper to check if an instruction is ready to execute
    const validateInstruction = useCallback((instructionName: string, instruction: InstructionData) => {
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

            try {
                if (!idl) throw new Error('Idl is absent');
                if (!program) throw new Error('Program is not initialized');
                if (!wallet) throw new Error('Wallet is not initialized');

                // FIXME: we use [[]] ad-hoc wrapper for tests. settle that at the populator
                const ix = await executor.getInstruction(
                    program,
                    instructionName,
                    populateAccounts(params.accounts, instructionName) as Record<string, object>,
                    [[populateArguments(params.arguments, instructionName)]],
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

                // Get recent blockhash
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = publicKey;

                // Sign the transaction
                const signedTransaction = await wallet.signTransaction(transaction);

                // // Send the transaction
                // const signature = await connection.sendRawTransaction(signedTransaction.serialize());

                // // Wait for confirmation
                // const confirmation = await connection.confirmTransaction(signature, 'confirmed');

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

                console.log({ confirmed, signature });

                return signature;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                setLastError(errorMessage);
                console.error('Instruction execution failed:', error);
                return null;
            } finally {
                setIsExecuting(false);
            }
        },
        [connected, publicKey, wallet, connection, idl, executor, program]
    );

    return {
        initializeProgram,
        instructionState,
        invokeInstruction,
        isExecuting,
        isInitialized,
        isProgramLoading,
        lastError,
        program,
        validateInstruction,
        initializationError,
    };
}
