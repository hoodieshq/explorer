// The legacy route: the client refuses the document; the consumer decodes with their own decoder.
import type { Instruction } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { tryCreateIdlClient } from '../../client';
import { isLegacyAnchorIdl } from '../../detect';
import { IDL_ERROR__UNSUPPORTED_IDL_FORMAT } from '../../errors';
import type { LegacyAnchorIdl } from '../../types';
import { LEGACY_WITHDRAW_DISCRIMINATOR, legacyAnchorIdl, legacyWithdrawIx } from '../fixtures';

describe('legacy Anchor custom decoder route', () => {
    it('should refuse the legacy document with a typed error', () => {
        const [error, client] = tryCreateIdlClient(legacyAnchorIdl);
        expect(client).toBeUndefined();
        expect(error?.code).toBe(IDL_ERROR__UNSUPPORTED_IDL_FORMAT);
    });

    it('should route the document to a consumer-owned decoder via the guard', () => {
        expect(isLegacyAnchorIdl(legacyAnchorIdl)).toBe(true);
        expect(decodeLegacyWithdraw(legacyAnchorIdl, legacyWithdrawIx)).toEqual({ amount: 42n, name: 'withdraw' });
    });
});

// Stand-in for a consumer-owned legacy decoder: match the sha256-derived discriminator, read the args.
function decodeLegacyWithdraw(idl: LegacyAnchorIdl, ix: Instruction): { amount: bigint; name: string } | undefined {
    const data = ix.data ? Uint8Array.from(ix.data) : new Uint8Array();
    const matches = LEGACY_WITHDRAW_DISCRIMINATOR.every((byte, i) => data[i] === byte);
    if (!matches || !idl.instructions.some(item => item.name === 'withdraw')) return undefined;
    const view = new DataView(data.buffer, data.byteOffset + LEGACY_WITHDRAW_DISCRIMINATOR.length);
    return { amount: view.getBigUint64(0, true), name: 'withdraw' };
}
