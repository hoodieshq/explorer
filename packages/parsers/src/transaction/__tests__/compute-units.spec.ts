import { describe, expect, it } from 'vitest';

import { getRequestedComputeUnits } from '../compute-units.js';
import {
    bpfInstruction,
    setComputeUnitLimit,
    transactionWithInstructions,
    transfer,
    v1TransactionWithConfig,
    v1TransactionWithLimitAndInstructions,
} from './fixtures.js';

const CONTEXT = { cluster: 'mainnet-beta', epoch: 1000n } as const;

describe('getRequestedComputeUnits', () => {
    it('should report a v1 limit as declared', () => {
        const transaction = v1TransactionWithConfig({ computeUnitLimit: 19 });

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'declared', value: 19 });
    });

    it('should report an absent v1 limit as a fallback to zero', () => {
        const transaction = v1TransactionWithConfig(undefined);

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'fallback', value: 0 });
    });

    it('should cap a v1 declared limit at the runtime maximum', () => {
        const transaction = v1TransactionWithConfig({ computeUnitLimit: 5_000_000 });

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'declared', value: 1_400_000 });
    });

    it('should read a v1 limit from the config and ignore limit instructions', () => {
        const transaction = v1TransactionWithLimitAndInstructions(10_000, [setComputeUnitLimit(999_999)]);

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'declared', value: 10_000 });
    });

    it('should honour the first of two limit instructions', () => {
        const transaction = transactionWithInstructions('legacy', [
            setComputeUnitLimit(100_000),
            setComputeUnitLimit(200_000),
        ]);

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'declared', value: 100_000 });
    });

    it('should report a SetComputeUnitLimit instruction as declared', () => {
        const transaction = transactionWithInstructions('legacy', [setComputeUnitLimit(100_000), transfer()]);

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'declared', value: 100_000 });
    });

    it('should cap a declared SetComputeUnitLimit instruction at the runtime maximum', () => {
        const transaction = transactionWithInstructions('legacy', [setComputeUnitLimit(5_000_000), transfer()]);

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'declared', value: 1_400_000 });
    });

    it('should sum the per-program reserves when no instruction sets a limit', () => {
        const transaction = transactionWithInstructions('legacy', [transfer(), transfer()]);

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'calculated', value: 6_000 });
    });

    it('should discard the reserves accumulated before a limit instruction', () => {
        const transaction = transactionWithInstructions('legacy', [transfer(), setComputeUnitLimit(100_000)]);

        expect(getRequestedComputeUnits(transaction, CONTEXT)).toEqual({ source: 'declared', value: 100_000 });
    });

    it('should cap the total at the runtime maximum', () => {
        const instructions = Array.from({ length: 10 }, () => bpfInstruction());

        expect(getRequestedComputeUnits(transactionWithInstructions('legacy', instructions), CONTEXT).value).toBe(
            1_400_000,
        );
    });

    it('should report zero for a transaction with no instructions', () => {
        expect(getRequestedComputeUnits(transactionWithInstructions('legacy', []), CONTEXT)).toEqual({
            source: 'calculated',
            value: 0,
        });
    });
});
