import { parseAccountData } from '@codama/dynamic-parsers';
import { describe, expect, it, vi } from 'vitest';

import { decodeAccountWithIdl } from '../../codama/decode-account';
import { IDL_ERROR__ACCOUNT_DECODE_FAILED, IDL_ERROR__IDL_PARSE_FAILED } from '../../errors';
import { type AnchorIdl, IdlStandard } from '../../types';
import { loadTokenkegIdl } from '../fixtures';

vi.mock('@codama/dynamic-parsers', () => ({
    parseAccountData: vi.fn(),
}));

describe('decodeAccountWithIdl', () => {
    it('should return conversion errors for detected-but-unconvertible Anchor IDLs', () => {
        const brokenIdl = {
            address: '11111111111111111111111111111111',
            instructions: [{ accounts: [], args: [{ name: 'x', type: 'not-a-type' }], discriminator: [9], name: 'boom' }],
            metadata: { name: 'broken', spec: '0.1.0', version: '0.0.1' },
        } as unknown as AnchorIdl;

        const decode = decodeAccountWithIdl(brokenIdl, Uint8Array.from([1, 2, 3]));

        if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
        expect(decode.errors.map(e => e.code)).toEqual([IDL_ERROR__IDL_PARSE_FAILED]);
    });

    it('should wrap parser throws as account-decode failures', () => {
        const cause = new Error('short account data');
        vi.mocked(parseAccountData).mockImplementation(() => {
            throw cause;
        });

        const data = Uint8Array.from([1, 2, 3]);
        const decode = decodeAccountWithIdl(loadTokenkegIdl(), data);

        if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
        expect(decode.errors).toHaveLength(1);
        expect(decode.errors[0]).toMatchObject({
            code: IDL_ERROR__ACCOUNT_DECODE_FAILED,
            context: {
                dataLength: data.length,
                standard: IdlStandard.Codama,
            },
        });
        expect(decode.errors[0]?.cause).toBe(cause);
    });
});
