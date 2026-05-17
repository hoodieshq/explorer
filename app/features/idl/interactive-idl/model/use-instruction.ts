'use client';

import { getIdlSpecType, type InstructionData } from '@entities/idl';
import { useWallet } from '@solana/wallet-adapter-react';
import { type Commitment, Connection, type Finality, PublicKey, type Transaction } from '@solana/web3.js';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCluster } from '@/app/providers/cluster';
import { Logger } from '@/app/shared/lib/logger';
import { clusterUrl } from '@/app/utils/cluster';

import { programAtom } from '../model/state-atoms';
import { AnchorInterpreter } from './anchor/anchor-interpreter';
import { CodamaInterpreter } from './codama/codama-interpreter';
import { IdlExecutor } from './idl-executor';
import { buildTransaction } from './transaction/build-transaction';
import type { InstructionInvocationResult, SimulationResult } from './transaction/types';
import { useInvokeTransaction } from './transaction/use-invoke-transaction';
import { useSimulateTransaction } from './transaction/use-simulate-transaction';
import type { UnifiedWallet } from './unified-program';
import { BaseIdl } from './unified-program';

export type { InstructionInvocationResult } from './transaction/types';

interface UseInstructionOptions {
    programId?: string;
    cluster?: string;
    idl?: BaseIdl;
    enabled?: boolean;
    interpreterName?: typeof AnchorInterpreter.NAME | typeof CodamaInterpreter.NAME;
    commitment?: Finality;
    /** Commitment level for transaction simulation. Defaults to 'processed'. */
    simulationCommitment?: Commitment;
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    onPreInvocationError?: (error: string) => void;
}

interface UseInstructionReturn {
    // Execution
    invokeInstruction: (
        instructionName: string,
        instruction: InstructionData,
        params: { accounts: any; arguments: Record<string, string> },
    ) => Promise<void>;

    // Simulation (additive — drives the dedicated Simulate UI without sending)
    simulateInstruction: (
        instructionName: string,
        instruction: InstructionData,
        params: { accounts: any; arguments: Record<string, string> },
    ) => Promise<void>;

    // Validation helpers
    validateInstruction: (
        instructionName: string,
        instruction: InstructionData,
    ) => { isValid: boolean; errors: string[] };

    // Status
    isExecuting: boolean;
    isSimulating: boolean;
    preInvocationError: string | null;
    lastResult: InstructionInvocationResult;
    lastSimulation: SimulationResult;
    parseLogs: ReturnType<typeof useInvokeTransaction>['parseLogs'];
    simulateParseLogs: ReturnType<typeof useSimulateTransaction>['parseLogs'];
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
    interpreterName: interpreterNameOverride,
    commitment = 'confirmed',
    simulationCommitment = 'processed',
    onSuccess,
    onError,
    onPreInvocationError,
}: UseInstructionOptions): UseInstructionReturn {
    const interpreterName = interpreterNameOverride ?? detectInterpreterName(idl);
    const { publicKey, ...wallet } = useWallet();
    const { cluster: currentCluster, customUrl } = useCluster();

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
    const executorRef = useRef<IdlExecutor>(undefined);
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

            Logger.error(new Error(errorMessage));
            setInitializationError(errorMessage);
            setProgram(undefined);
        } finally {
            setIsProgramLoading(false);
        }
    }, [enabled, idl, programId, executor, unifiedWallet, interpreterName, setProgram]);

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
        return { errors, isValid: errors.length === 0 };
    }, []);

    const invokeTx = useInvokeTransaction({
        commitment,
        connection,
        idlErrors: idl?.errors,
        onError,
        onPreInvocationError,
        onSuccess,
        simulationCommitment,
    });

    const simulateTx = useSimulateTransaction({
        connection,
        idlErrors: idl?.errors,
        simulationCommitment,
    });

    const invokeInstruction = useCallback(
        async (
            instructionName: string,
            _instruction: InstructionData,
            params: { accounts: any; arguments: Record<string, string> },
        ): Promise<void> => {
            if (!idl || !program || !publicKey) {
                invokeTx.reportError(new Error('Program / IDL / wallet not ready'));
                return;
            }
            let tx: Transaction;
            try {
                tx = await buildTransaction({
                    executor,
                    feePayer: publicKey,
                    idl,
                    instructionName,
                    interpreterName,
                    params,
                    program,
                });
            } catch (error) {
                invokeTx.reportError(error);
                return;
            }
            await invokeTx.invoke(tx);
        },
        [idl, program, publicKey, executor, interpreterName, invokeTx],
    );

    const simulateInstruction = useCallback(
        async (
            instructionName: string,
            _instruction: InstructionData,
            params: { accounts: any; arguments: Record<string, string> },
        ): Promise<void> => {
            if (!idl || !program || !publicKey) {
                simulateTx.reportError(new Error('Program / IDL / wallet not ready'));
                return;
            }
            let tx: Transaction;
            try {
                tx = await buildTransaction({
                    executor,
                    feePayer: publicKey,
                    idl,
                    instructionName,
                    interpreterName,
                    params,
                    program,
                });
            } catch (error) {
                simulateTx.reportError(error);
                return;
            }
            await simulateTx.simulate(tx);
        },
        [idl, program, publicKey, executor, interpreterName, simulateTx],
    );

    return {
        initializationError,
        initializeProgram,
        invokeInstruction,
        isExecuting: invokeTx.isExecuting,
        isProgramLoading,
        isSimulating: simulateTx.isSimulating,
        lastResult: invokeTx.lastResult,
        lastSimulation: simulateTx.lastSimulation,
        parseLogs: invokeTx.parseLogs,
        preInvocationError: invokeTx.preInvocationError,
        program,
        simulateInstruction,
        simulateParseLogs: simulateTx.parseLogs,
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

/**
 * Auto-detect the interpreter name based on the IDL type.
 * Falls back to Anchor interpreter for unknown/missing IDLs.
 */
function detectInterpreterName(idl?: BaseIdl): typeof AnchorInterpreter.NAME | typeof CodamaInterpreter.NAME {
    if (idl && getIdlSpecType(idl) === 'codama') {
        return CodamaInterpreter.NAME;
    }
    return AnchorInterpreter.NAME;
}
