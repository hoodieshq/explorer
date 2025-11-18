import { Connection, PublicKey, TransactionInstruction, VersionedMessage } from '@solana/web3.js';

import { IdlInterpreter } from '../idl-interpreter.d';
import { UnifiedAccounts, UnifiedArguments, UnifiedProgram, UnifiedWallet } from '../unified-program.d';

/**
 * Codama IDL interpreter (stub implementation)
 * Currently not supported, but properly identifies Codama IDLs to prevent infinite retries
 */
export class CodamaInterpreter implements IdlInterpreter<any, UnifiedProgram> {
    name = 'codama';

    canHandle(idl: any): boolean {
        // Check for Codama IDL based on the standard field
        // This is the canonical way to identify Codama IDLs in the codebase
        return Boolean(idl) && typeof idl === 'object' && idl.standard === 'codama';
    }

    async createProgram(
        connection: Connection,
        wallet: UnifiedWallet,
        programId: PublicKey | string,
        idl: any
    ): Promise<UnifiedProgram> {
        throw new Error('Codama IDL format is not yet supported for interactive features.');
    }

    async createInstruction(
        program: UnifiedProgram,
        instructionName: string,
        accounts: UnifiedAccounts,
        args: UnifiedArguments
    ): Promise<TransactionInstruction | VersionedMessage> {
        throw new Error('Codama IDL format is not yet supported for interactive features.');
    }
}
