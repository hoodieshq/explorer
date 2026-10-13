import { Message, MessageV0 } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import {
    createV1TransactionBytes,
    createWeb3TransactionBytes,
} from '@/app/entities/transaction-data/__fixtures__/wire-transactions';
import { parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';

import { deserializeLegacyOrV0Message } from '../utils';

describe('deserializeLegacyOrV0Message', () => {
    it.each([
        { MessageClass: Message, version: 'legacy' as const },
        { MessageClass: MessageV0, version: 0 as const },
    ])('should deserialize a $version message', ({ MessageClass, version }) => {
        const { messageBytes } = parseTransactionBytes(createWeb3TransactionBytes(version));

        const message = deserializeLegacyOrV0Message(messageBytes);

        expect(message).toBeInstanceOf(MessageClass);
        expect(message.version).toBe(version);
    });

    it('should throw on v1 message bytes', () => {
        const { messageBytes } = parseTransactionBytes(createV1TransactionBytes({}));

        expect(() => deserializeLegacyOrV0Message(messageBytes)).toThrow();
    });
});
