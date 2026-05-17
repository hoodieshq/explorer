import {
    type Commitment,
    type Connection,
    type RpcResponseAndContext,
    type SimulatedTransactionResponse,
    type Transaction,
    type TransactionError,
    VersionedTransaction,
} from '@solana/web3.js';

import { getTransactionInstructionError } from '@/app/utils/program-err';

import type { BaseIdl } from '../unified-program';

export async function simulateTransaction(
    connection: Connection,
    transaction: Transaction,
    options: { commitment: Commitment; sigVerify?: boolean; replaceRecentBlockhash?: boolean },
): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
    return connection.simulateTransaction(new VersionedTransaction(transaction.compileMessage()), {
        commitment: options.commitment,
        replaceRecentBlockhash: options.replaceRecentBlockhash,
        sigVerify: options.sigVerify,
    });
}

export function assertSimulationOk(err: TransactionError | null, idlErrors: BaseIdl['errors'] | undefined): void {
    if (err === null) return;
    const programError = getTransactionInstructionError(err);
    if (programError) {
        const instructionNum = programError.index + 1;
        const customCode = extractCustomErrorCode(err);
        const idlError = customCode !== undefined ? resolveIdlError(customCode, idlErrors) : undefined;
        const errorMessage = idlError ? `"${idlError.name}" (code:${customCode})` : programError.message;
        throw new Error(`Instruction #${instructionNum} got ${errorMessage}. See logs for details`);
    }
    const errorDetail = JSON.stringify(err);
    throw new Error(`Simulated with errors: "${errorDetail}". See logs for details`);
}

function extractCustomErrorCode(error: TransactionError | null): number | undefined {
    if (!error || typeof error !== 'object') return undefined;
    if (!('InstructionError' in error)) return undefined;
    const innerError = (error as any)['InstructionError'];
    if (!Array.isArray(innerError) || innerError.length < 2) return undefined;
    const instructionError = innerError[1];
    if (typeof instructionError === 'object' && instructionError !== null && 'Custom' in instructionError) {
        return (instructionError as { Custom: number }).Custom;
    }
    return undefined;
}

function resolveIdlError(code: number, errors: BaseIdl['errors']) {
    return errors?.find((e: any) => e.code === code);
}
