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
import { loadLetMeBuyIdl, loadSimpleIdl, loadTokenkegIdl, pre030AnchorIdl } from '../fixtures';

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

    it('should label a modern Anchor IDL with the standard-era wildcard', () => {
        expect(getIdlVersion(loadSimpleIdl())).toBe(MODERN_ANCHOR_IDL_WILDCARD);
    });

    it('should return the format version from metadata.spec', () => {
        expect(getIdlFormatVersion(loadSimpleIdl())).toBe('0.1.0');
    });

    it('should return the program version from metadata.version', () => {
        expect(getIdlProgramVersion(loadSimpleIdl())).toBe('0.1.0');
    });
});
