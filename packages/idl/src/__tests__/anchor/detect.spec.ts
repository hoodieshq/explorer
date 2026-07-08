import { describe, expect, it } from 'vitest';

import {
    getIdlFormatVersion,
    getIdlProgramVersion,
    getIdlStandard,
    getIdlVersion,
    isAnchorIdl,
    isSupportedIdl,
    MODERN_ANCHOR_IDL_WILDCARD,
} from '../../detect';
import { IdlStandard } from '../../types';
import {
    loadLetMeBuyIdl,
    loadLetMeBuyPmpIdl,
    loadSimple031Idl,
    loadSimpleIdl,
    loadTokenkegIdl,
    pre030AnchorIdl,
} from '../fixtures';

describe('isAnchorIdl', () => {
    it('should accept a modern Anchor IDL', () => {
        const letMeBuy = loadLetMeBuyIdl();
        expect(isAnchorIdl(letMeBuy)).toBe(true);
        expect(isSupportedIdl(letMeBuy)).toBe(true);
    });

    it('should reject a legacy Anchor IDL', () => {
        expect(isAnchorIdl(pre030AnchorIdl)).toBe(false);
    });

    it('should reject a Codama root node', () => {
        expect(isAnchorIdl(loadTokenkegIdl())).toBe(false);
    });

    it.each([null, undefined, 42, 'idl', {}, []])('should reject non-IDL input %#', value => {
        expect(isAnchorIdl(value)).toBe(false);
    });
});

describe('Anchor version helpers', () => {
    it('should identify the Anchor standard', () => {
        expect(getIdlStandard(loadSimpleIdl())).toBe(IdlStandard.Anchor);
    });

    // every anchor-era acquisition point labels the same — the wildcard marks the standard, not the toolchain version
    it.each([
        ['simple (anchor-lang 1.1.2 workspace build)', loadSimpleIdl],
        ['simple-031 (anchor-lang 0.31.1 workspace build)', loadSimple031Idl],
        ['let_me_buy (mainnet Anchor PDA leg)', loadLetMeBuyIdl],
        ['let_me_buy (mainnet PMP leg)', loadLetMeBuyPmpIdl],
    ])('should label %s with the standard-era wildcard', (_, loadIdl) => {
        expect(getIdlVersion(loadIdl())).toBe(MODERN_ANCHOR_IDL_WILDCARD);
    });

    it('should return the format version from metadata.spec', () => {
        expect(getIdlFormatVersion(loadSimpleIdl())).toBe('0.1.0');
    });

    it('should return the program version from metadata.version', () => {
        expect(getIdlProgramVersion(loadSimpleIdl())).toBe('0.1.0');
    });
});
