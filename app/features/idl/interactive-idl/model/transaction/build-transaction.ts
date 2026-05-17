import { type PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

import type { AnchorInterpreter } from '../anchor/anchor-interpreter';
import type { CodamaInterpreter } from '../codama/codama-interpreter';
import { type IdlExecutor, populateAccounts, populateArguments } from '../idl-executor';
import type { BaseIdl, UnifiedProgram } from '../unified-program';

export async function buildTransaction(args: {
    program: UnifiedProgram;
    instructionName: string;
    params: { accounts: any; arguments: Record<string, string> };
    idl: BaseIdl;
    interpreterName: typeof AnchorInterpreter.NAME | typeof CodamaInterpreter.NAME;
    executor: IdlExecutor;
    feePayer: PublicKey;
}): Promise<Transaction> {
    const { program, instructionName, params, idl, interpreterName, executor, feePayer } = args;
    const ix = await executor.getInstruction(
        program,
        instructionName,
        populateAccounts(params.accounts, instructionName),
        populateArguments(params.arguments, instructionName),
        idl,
        interpreterName,
    );
    if (!(ix instanceof TransactionInstruction)) {
        throw new Error('Unsupported instruction format');
    }
    const tx = new Transaction().add(ix);
    tx.feePayer = feePayer;
    return tx;
}
