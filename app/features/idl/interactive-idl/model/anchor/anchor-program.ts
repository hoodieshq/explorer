import { Idl as AnchorIdl, Program as AnchorProgram } from '@coral-xyz/anchor';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';

import { UnifiedAccounts, UnifiedArguments, UnifiedProgram } from '../unified-program.d';

/**
 * Unified program implementation for Anchor
 */
export class AnchorUnifiedProgram implements UnifiedProgram {
    constructor(
        public programId: PublicKey,
        public idl: AnchorIdl,
        private program: AnchorProgram,
        private connection: Connection
    ) {}

    // Build the instruction using Anchor's methods
    async buildInstruction(
        instructionName: string,
        args: UnifiedArguments,
        accounts: UnifiedAccounts
    ): Promise<TransactionInstruction> {
        try {
            const instruction = this.program.methods[instructionName];

            return instruction(...args)
                .accounts(accounts)
                .instruction();
        } catch (error) {
            throw new Error(
                `Failed to build instruction "${instructionName}": ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    async executeInstruction(
        instructionName: string,
        args: UnifiedArguments,
        accounts: UnifiedAccounts
    ): Promise<TransactionInstruction> {
        // do not execute instruction as the process might vary, but allow to have a proper method to execute it later
        return this.buildInstruction(instructionName, args, accounts);
    }
}
