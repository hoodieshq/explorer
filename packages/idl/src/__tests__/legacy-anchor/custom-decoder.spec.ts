// The legacy route: the client refuses the document; the consumer decodes with their own decoder.
import type { Instruction } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { tryCreateIdlClient } from '../../client';
import { isLegacyAnchorIdl } from '../../detect';
import { IDL_ERROR__UNSUPPORTED_IDL_FORMAT } from '../../errors';
import type { LegacyAnchorIdl } from '../../types';
import { loadNtt029Idl, NTT_TRANSFER_BURN_DISCRIMINATOR, ntt029TransferIx } from '../fixtures';

describe('legacy Anchor custom decoder route', () => {
    it('should refuse the legacy document with a typed error', () => {
        const [error, client] = tryCreateIdlClient(loadNtt029Idl());
        expect(client).toBeUndefined();
        expect(error?.code).toBe(IDL_ERROR__UNSUPPORTED_IDL_FORMAT);
    });

    it('should route the document to a consumer-owned decoder via the guard', () => {
        expect(isLegacyAnchorIdl(loadNtt029Idl())).toBe(true);
        expect(decodeLegacyTransferBurn(loadNtt029Idl(), ntt029TransferIx)).toEqual({
            amount: 42n,
            name: 'transferBurn',
        });
    });
});

// Stand-in for a consumer-owned legacy decoder: match the sha256-derived discriminator, read the args.
function decodeLegacyTransferBurn(idl: LegacyAnchorIdl, ix: Instruction): { amount: bigint; name: string } | undefined {
    const data = ix.data ? Uint8Array.from(ix.data) : new Uint8Array();
    const matches = NTT_TRANSFER_BURN_DISCRIMINATOR.every((byte, i) => data[i] === byte);
    if (!matches || !idl.instructions.some(item => item.name === 'transferBurn')) return undefined;
    const view = new DataView(data.buffer, data.byteOffset + NTT_TRANSFER_BURN_DISCRIMINATOR.length);
    return { amount: view.getBigUint64(0, true), name: 'transferBurn' };
}
