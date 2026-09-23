import { describe, expect, it } from 'vitest';

import { gen } from '../../__tests__/gen.js';
import {
    LEGACY_TRANSACTION_SIZE_LIMIT,
    transactionSizeLimit,
    transactionWireSize,
    V1_TRANSACTION_SIZE_LIMIT,
} from '../size.js';
import type { ParsedTransaction } from '../types.js';
import { legacyTransaction, v1Transaction } from './fixtures.js';

const BASE = {
    accounts: [],
    instructions: [],
    lifetimeToken: gen.blockhash(7),
    numSignerAccounts: 1,
    signatures: [],
};

const LEGACY_VALUE: ParsedTransaction = { ...BASE, version: 'legacy' };
const V1_VALUE: ParsedTransaction = { ...BASE, version: 1 };

describe('transactionSizeLimit', () => {
    it('should cap a legacy transaction at the packet size', () => {
        expect(transactionSizeLimit(LEGACY_VALUE)).toBe(LEGACY_TRANSACTION_SIZE_LIMIT);
    });

    it('should cap a v1 transaction at 4096 bytes', () => {
        expect(transactionSizeLimit(V1_VALUE)).toBe(V1_TRANSACTION_SIZE_LIMIT);
    });

    it('should read the limit off raw bytes by their version prefix', () => {
        expect(transactionSizeLimit(new Uint8Array([0x81, 0x00]))).toBe(V1_TRANSACTION_SIZE_LIMIT);
        expect(transactionSizeLimit(new Uint8Array([0x80, 0x00]))).toBe(LEGACY_TRANSACTION_SIZE_LIMIT);
    });

    it('should not mistake a single-signer legacy message for v1', () => {
        expect(transactionSizeLimit(new Uint8Array([0x01, 0x00]))).toBe(LEGACY_TRANSACTION_SIZE_LIMIT);
    });

    it('should read the limit off a compiled message', () => {
        const compiled = v1Transaction.compiled();

        expect(transactionSizeLimit(compiled)).toBe(V1_TRANSACTION_SIZE_LIMIT);
    });
});

describe('transactionWireSize', () => {
    it('should count the signature-count byte for legacy and v0', () => {
        const messageBytes = legacyTransaction.messageBytes();
        const signerCount = legacyTransaction.compiled().header.numSignerAccounts;

        expect(transactionWireSize(messageBytes)).toBe(1 + 64 * signerCount + messageBytes.length);
    });

    it('should drop the signature-count byte for v1 tx', () => {
        const messageBytes = v1Transaction.messageBytes();
        const signerCount = v1Transaction.compiled().header.numSignerAccounts;

        expect(transactionWireSize(messageBytes)).toBe(64 * signerCount + messageBytes.length);
    });
});
