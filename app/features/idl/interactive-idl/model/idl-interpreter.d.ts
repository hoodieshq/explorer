import { Connection, PublicKey, TransactionInstruction, VersionedMessage } from '@solana/web3.js';

import { BaseIdl, UnifiedProgram, UnifiedWallet } from './unified-program.d';

export interface IdlInterpreter<TIdl extends BaseIdl = BaseIdl> {
    /**
     * Name of the interpreter (e.g., 'anchor', 'codama')
     */
    name: string;

    /**
     * Check if this interpreter can handle the given IDL
     */
    canHandle(idl: unknown): boolean;

    /**
     * Create a unified program from an IDL
     */
    createProgram(
        connection: Connection,
        wallet: UnifiedWallet,
        programId: PublicKey | string,
        idl: TIdl
    ): Promise<UnifiedProgram>;

    /**
     * Create instruction instance
     */
    createInstruction(
        program: UnifiedProgram,
        instructionName: string,
        accounts: Record<string, object>,
        arguments: Array<unknown>
    ): Promise<TransactionInstruction | VersionedMessage>;
}
