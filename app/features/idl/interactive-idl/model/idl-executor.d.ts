import { Connection, PublicKey, VersionedMessage } from '@solana/web3.js';

import { IdlInterpreter } from './idl-interpreter.d';
import { BaseIdl, UnifiedAccounts, UnifiedArguments, UnifiedProgram, UnifiedWallet } from './unified-program.d';

/**
 * Configuration for the IDL executor
 */
export interface IdlExecutorConfig {
    connection: Connection;
    interpreters?: IdlInterpreter[];
}

interface IdlExecutorSpec {
    getInstruction<T extends BaseIdl>(
        program: UnifiedProgram,
        instructionName: string,
        accs: UnifiedAccounts,
        args: UnifiedArguments,
        idl: T,
        interpreterName: string
    ): TransactionInstruction | VersionedMessage;
    initializeProgram<T extends BaseIdl>(
        idl: T,
        programId: PublicKey,
        wallet: UnifiedWallet,
        interpreterName: string
    ): Promise<UnifiedProgram>;
    setConnection(connection: Connection): void;
}
