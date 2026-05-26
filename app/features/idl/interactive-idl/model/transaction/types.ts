import type { SimulatedTransactionResponse } from '@solana/web3.js';

export type InstructionInvocationResult = InvocationOkResult | InvocationErrResult | null;
export type InvocationOkResult = { status: 'success'; signature: string; logs: string[]; finishedAt: Date };
export type InvocationErrResult = {
    status: 'error';
    signature: string | null;
    message: string;
    logs: string[];
    serializedTxMessage: string | null;
    finishedAt: Date;
};

export type InstructionSimulationResult = SimulationOkSuccess | SimulationErrResult | null;
export type SimulationOkSuccess = {
    status: 'success';
    logs: string[];
    returnData: SimulatedTransactionResponse['returnData'];
    unitsConsumed: number | undefined;
    serializedTxMessage: string | null;
    finishedAt: Date;
};
export type SimulationErrResult = {
    status: 'error';
    message: string;
    logs: string[];
    serializedTxMessage: string | null;
    finishedAt: Date;
};
