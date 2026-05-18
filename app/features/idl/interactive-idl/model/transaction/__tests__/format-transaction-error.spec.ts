import { describe, expect, it } from 'vitest';

import { formatTransactionError } from '../format-transaction-error';

describe('formatTransactionError', () => {
    it('should resolve IDL error name from Custom code', () => {
        const err = { InstructionError: [0, { Custom: 6001 }] } as any;
        const idlErrors = [{ code: 6001, name: 'AlreadyInitialized' }];
        const message = formatTransactionError(err, idlErrors);
        expect(message).toContain('AlreadyInitialized');
        expect(message).toContain('code:6001');
    });

    it('should fall back to programError.message when IDL lookup misses', () => {
        const err = { InstructionError: [0, { Custom: 9999 }] } as any;
        expect(formatTransactionError(err, [])).toContain('Instruction #1 got ');
    });

    it('should return generic transaction-failed message for non-InstructionError variants', () => {
        expect(formatTransactionError({ Unknown: 'error' } as any, [])).toContain('Transaction failed');
    });
});
