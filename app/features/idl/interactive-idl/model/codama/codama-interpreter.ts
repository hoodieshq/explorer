import { createProgramClient } from '@codama/dynamic-client';
import { getIdlSpecType } from '@entities/idl/model/converters/convert-legacy-idl';
import type { Connection, TransactionInstruction, VersionedMessage } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';

import type { IdlInterpreter } from '../idl-interpreter.d';
import type { BaseIdl, UnifiedAccounts, UnifiedArguments, UnifiedWallet } from '../unified-program.d';
import { CodamaUnifiedProgram } from './codama-program';
import { normalizeAccounts } from './normalize-accounts';

/**
 * Codama IDL interpreter
 */
export class CodamaInterpreter implements IdlInterpreter<BaseIdl, CodamaUnifiedProgram> {
    static readonly NAME = 'codama' as const;
    name = CodamaInterpreter.NAME;

    canHandle(idl: unknown): boolean {
        return getIdlSpecType(idl) === CodamaInterpreter.NAME;
    }

    async createProgram(
        _connection: Connection,
        _wallet: UnifiedWallet,
        programId: PublicKey | string,
        idl: BaseIdl,
    ): Promise<CodamaUnifiedProgram> {
        const publicKey = typeof programId === 'string' ? new PublicKey(programId) : programId;
        const programIdStr = publicKey.toBase58();

        const client = createProgramClient(idl, { programId: programIdStr });

        return new CodamaUnifiedProgram(publicKey, idl, client);
    }

    async createInstruction(
        program: CodamaUnifiedProgram,
        instructionName: string,
        accounts: Record<string, string> | UnifiedAccounts,
        args: UnifiedArguments,
    ): Promise<TransactionInstruction | VersionedMessage> {
        return program.buildInstruction(instructionName, normalizeAccounts(accounts), args);
    }
}
