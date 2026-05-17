import type { SimulatedTransactionResponse } from '@solana/web3.js';

export type InstructionInvocationResult =
    | { status: 'success'; signature: string; logs: string[]; finishedAt: Date }
    | { status: 'error'; message: string; logs: string[]; serializedTxMessage: string | null; finishedAt: Date }
    | null;

export type SimulationResult =
    | {
          status: 'success';
          logs: string[];
          returnData: SimulatedTransactionResponse['returnData'];
          unitsConsumed: number | undefined;
          finishedAt: Date;
      }
    | { status: 'error'; message: string; logs: string[]; finishedAt: Date }
    | null;
