// Standard-agnostic matcher behavior; the per-standard table builders live in anchor/ and codama/.
import { describe, expect, it } from 'vitest';

import { convertToCodama } from '../anchor/convert';
import { buildInstructionNameTable, matchInstructionName } from '../names';
import type { SupportedIdl } from '../types';
import { loadLetMeBuyIdl } from './fixtures';
import { unwrap } from './unwrap';

describe('matchInstructionName', () => {
    it('should prefer the longest matching prefix', () => {
        const table = [
            { discriminator: Uint8Array.from([1]), name: 'Short', offset: 0 },
            { discriminator: Uint8Array.from([1, 2]), name: 'Long', offset: 0 },
        ];
        expect(matchInstructionName(table, Uint8Array.from([1, 2, 3]))).toBe('Long');
    });

    it('should return undefined when nothing matches', () => {
        const table = [{ discriminator: Uint8Array.from([9]), name: 'Nope', offset: 0 }];
        expect(matchInstructionName(table, Uint8Array.from([1, 2]))).toBeUndefined();
    });

    it('should skip empty discriminators instead of matching everything', () => {
        const table = [{ discriminator: new Uint8Array(), name: 'CatchAll', offset: 0 }];
        expect(matchInstructionName(table, Uint8Array.from([1]))).toBeUndefined();
    });

    it('should reject discriminators longer than the provided data', () => {
        const table = [{ discriminator: Uint8Array.from([1, 2, 3]), name: 'Too Long', offset: 0 }];
        expect(matchInstructionName(table, Uint8Array.from([1, 2]))).toBeUndefined();
    });
});

describe('buildInstructionNameTable fallbacks', () => {
    it('should tolerate runtime Anchor IDLs without an instruction array', () => {
        const idl = { metadata: { spec: '0.1.0' } } as unknown as SupportedIdl;
        expect(buildInstructionNameTable(idl)).toEqual([]);
    });

    it('should tolerate runtime Codama IDLs without an instruction array', () => {
        // publicKey present so detection routes to the codama table — its instruction array is the missing piece
        const idl = {
            kind: 'rootNode',
            program: { publicKey: '11111111111111111111111111111111' },
        } as unknown as SupportedIdl;
        expect(buildInstructionNameTable(idl)).toEqual([]);
    });
});

// sha256("global:add_product")[:8] — the snake_case-derived discriminator, as stored on-chain.
const ADD_PRODUCT_DISC = [0, 219, 137, 36, 105, 180, 164, 93];
// sha256("global:addProduct")[:8] — what recomputing from the camelCase name WOULD produce.
const CAMEL_CASE_DISC = [88, 57, 229, 238, 129, 23, 77, 204];

const anchorEntry = () => {
    const entry = buildInstructionNameTable(loadLetMeBuyIdl()).find(item => item.name === 'Add Product');
    if (!entry) throw new Error('let_me_buy must declare add_product');
    return entry;
};

const codamaEntry = () => {
    const converted = unwrap(convertToCodama(loadLetMeBuyIdl()));
    const entry = buildInstructionNameTable(converted).find(item => item.name === 'Add Product');
    if (!entry) throw new Error('converted document must declare add_product');
    return entry;
};

// Anchor derives the instruction discriminator from the SNAKE_CASE name: sha256("global:add_product")[:8].
// The IDL then carries the raw snake_case name plus those bytes. The package reads the bytes (never
// recomputes), so these bytes must survive the Anchor→codama conversion unchanged — a @codama/* bump
// that recomputed from the camelCase name would silently break identification (unmatched, no error).
// SCOPE: modern Anchor (>= 0.30) only. Pre-0.30 legacy IDLs stored instruction names in camelCase;
// the 0.30 format switched to the raw snake_case identifier (which is what the discriminator hashes).
// The package rejects legacy IDLs, so that camelCase → snake_case reconstruction is NOT covered here.
describe('discriminator survives naming through conversion (real let_me_buy add_product)', () => {
    it('should read the snake_case-derived discriminator from the Anchor table', () => {
        expect([...anchorEntry().discriminator]).toEqual(ADD_PRODUCT_DISC);
    });

    it('should not carry the camelCase-derived discriminator', () => {
        expect([...anchorEntry().discriminator]).not.toEqual(CAMEL_CASE_DISC);
    });

    it('should preserve the same discriminator bytes through the codama conversion', () => {
        expect([...codamaEntry().discriminator]).toEqual(ADD_PRODUCT_DISC);
    });

    it('should resolve the instruction name from those bytes on both tables', () => {
        const bytes = Uint8Array.from(ADD_PRODUCT_DISC);
        const converted = unwrap(convertToCodama(loadLetMeBuyIdl()));

        expect(matchInstructionName(buildInstructionNameTable(loadLetMeBuyIdl()), bytes)).toBe('Add Product');
        expect(matchInstructionName(buildInstructionNameTable(converted), bytes)).toBe('Add Product');
    });
});
