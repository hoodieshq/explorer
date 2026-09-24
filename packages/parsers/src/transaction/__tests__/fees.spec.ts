import { describe, expect, it } from 'vitest';

import { gen } from '../../__tests__/gen.js';
import { derivePriorityFeeLamports, resolvePriorityFeeLamports } from '../fees.js';
import type { ParsedTransaction, TransactionConfig } from '../types.js';

function v1TransactionWithConfig(config: TransactionConfig | undefined): ParsedTransaction {
    return {
        accounts: [],
        instructions: [],
        lifetimeToken: gen.blockhash(7),
        numSignerAccounts: 1,
        signatures: [],
        version: 1,
        ...(config && { config }),
    };
}

function legacyTransactionWithSigners(count: number): ParsedTransaction {
    return {
        accounts: [],
        instructions: [],
        lifetimeToken: gen.blockhash(7),
        numSignerAccounts: count,
        signatures: [],
        version: 'legacy',
    };
}

describe('derivePriorityFeeLamports', () => {
    it('should back the per-signature base fee out of the total', () => {
        expect(derivePriorityFeeLamports({ feeLamports: 15_000, signatureCount: 1 })).toEqual(10_000);
        expect(derivePriorityFeeLamports({ feeLamports: 15_000, signatureCount: 2 })).toEqual(5_000);
    });

    it('should report no priority fee for a transaction that paid only the base fee', () => {
        expect(derivePriorityFeeLamports({ feeLamports: 5_000, signatureCount: 1 })).toEqual(0);
        expect(derivePriorityFeeLamports({ feeLamports: 10_000, signatureCount: 2 })).toEqual(0);
    });

    it('should floor at zero rather than report a negative priority fee', () => {
        expect(derivePriorityFeeLamports({ feeLamports: 5_000, signatureCount: 3 })).toEqual(0);
    });
});

describe('resolvePriorityFeeLamports', () => {
    it('should return the total from v1 transaction', () => {
        const transaction = v1TransactionWithConfig({ priorityFeeLamports: 24n });

        expect(resolvePriorityFeeLamports(transaction, { feeLamports: 9_999 })).toBe(24);
    });

    it('should return undefined for a v1 transaction with no declared fee', () => {
        const transaction = v1TransactionWithConfig(undefined);

        expect(resolvePriorityFeeLamports(transaction, { feeLamports: 8_000 })).toBeUndefined();
    });

    it('should return zero for a v1 transaction that declares a zero fee', () => {
        const transaction = v1TransactionWithConfig({ priorityFeeLamports: 0n });

        expect(resolvePriorityFeeLamports(transaction, { feeLamports: 8_000 })).toBe(0);
    });

    it('should derive the base fee out of a legacy total', () => {
        const transaction = legacyTransactionWithSigners(1);

        expect(resolvePriorityFeeLamports(transaction, { feeLamports: 7_000 })).toBe(2_000);
    });

    it('should never report a negative fee', () => {
        const transaction = legacyTransactionWithSigners(2);

        expect(resolvePriorityFeeLamports(transaction, { feeLamports: 5_000 })).toBe(0);
    });

    it('should return undefined when the fee is unknown', () => {
        const transaction = legacyTransactionWithSigners(1);

        expect(resolvePriorityFeeLamports(transaction, { feeLamports: undefined })).toBeUndefined();
    });
});
