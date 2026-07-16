// The consumer-owned decoder route for legacy IDLs — the escape for consumers who skip the
// client's convert-at-creation path (create-client.spec.ts) or hold IDLs conversion cannot handle.
import type { Instruction } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { isLegacyAnchorIdl } from '../../detect';
import type { AnchorV00Idl } from '../../types';
import { loadNtt029Idl, NTT_TRANSFER_BURN_DISCRIMINATOR, ntt029TransferIx } from '../fixtures';

describe('legacy Anchor custom decoder route', () => {
    it('should route the document to a consumer-owned decoder via the guard', () => {
        expect(isLegacyAnchorIdl(loadNtt029Idl())).toBe(true);
        expect(decodeLegacyTransferBurn(loadNtt029Idl(), ntt029TransferIx)).toEqual({
            amount: 42n,
            name: 'transferBurn',
        });
    });
});

// Stand-in for a consumer-owned legacy decoder: match the sha256-derived discriminator, read the args.
function decodeLegacyTransferBurn(idl: AnchorV00Idl, ix: Instruction): { amount: bigint; name: string } | undefined {
    const data = ix.data ? Uint8Array.from(ix.data) : new Uint8Array();
    const matches = NTT_TRANSFER_BURN_DISCRIMINATOR.every((byte, i) => data[i] === byte);
    if (!matches || !idl.instructions.some(item => item.name === 'transferBurn')) return undefined;
    const view = new DataView(data.buffer, data.byteOffset + NTT_TRANSFER_BURN_DISCRIMINATOR.length);
    return { amount: view.getBigUint64(0, true), name: 'transferBurn' };
}
