import { address, createNoopSigner } from '@solana/kit';
import {
    getUpdateTokenMetadataFieldInstruction,
    tokenMetadataField,
    UPDATE_TOKEN_METADATA_FIELD_DISCRIMINATOR,
} from '@solana-program/token-2022';
import { Keypair } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { getBytesDecoder, getDiscriminatorBytesDecoder } from '../index';

function randomAddress() {
    return address(Keypair.generate().publicKey.toBase58());
}

describe('getBytesDecoder', () => {
    it('should read the default 8-byte prefix and stop, leaving remaining bytes for downstream decoders', () => {
        const decoder = getBytesDecoder();
        const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 0xaa, 0xbb]);

        const [value, nextOffset] = decoder.read(bytes, 0);

        expect(Array.from(value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(nextOffset).toBe(8);
    });

    it('should honour a custom size argument', () => {
        const decoder = getBytesDecoder(4);
        const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

        const [value, nextOffset] = decoder.read(bytes, 0);

        expect(Array.from(value)).toEqual([1, 2, 3, 4]);
        expect(nextOffset).toBe(4);
    });

    it('should read the discriminator off a real @solana-program/token-2022 instruction without consuming the rest', () => {
        const ix = getUpdateTokenMetadataFieldInstruction({
            field: tokenMetadataField('Name'),
            metadata: randomAddress(),
            updateAuthority: createNoopSigner(randomAddress()),
            value: 'My Token',
        });

        const [value, nextOffset] = getBytesDecoder().read(ix.data, 0);

        expect(Array.from(value)).toEqual(Array.from(UPDATE_TOKEN_METADATA_FIELD_DISCRIMINATOR));
        expect(nextOffset).toBe(8);
        expect(ix.data.length).toBeGreaterThan(8);
    });
});

describe('getDiscriminatorBytesDecoder', () => {
    it('should behave like getBytesDecoder(8)', () => {
        const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 99]);

        const reference = getBytesDecoder(8).read(bytes, 0);
        const aliased = getDiscriminatorBytesDecoder().read(bytes, 0);

        expect(Array.from(aliased[0])).toEqual(Array.from(reference[0]));
        expect(aliased[1]).toBe(reference[1]);
    });
});
