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
import { anchorIdl, codamaIdl, legacyAnchorIdl } from '../fixtures';

describe('isAnchorIdl', () => {
    it('should accept a modern Anchor IDL', () => {
        expect(isAnchorIdl(anchorIdl)).toBe(true);
        expect(isSupportedIdl(anchorIdl)).toBe(true);
    });

    it('should reject a legacy Anchor IDL', () => {
        expect(isAnchorIdl(legacyAnchorIdl)).toBe(false);
    });

    it('should reject a Codama root node', () => {
        expect(isAnchorIdl(codamaIdl)).toBe(false);
    });

    it.each([null, undefined, 42, 'idl', {}, []])('should reject non-IDL input %#', value => {
        expect(isAnchorIdl(value)).toBe(false);
    });
});

describe('Anchor version helpers', () => {
    it('should identify the Anchor standard', () => {
        expect(getIdlStandard(anchorIdl)).toBe(IdlStandard.Anchor);
    });

    it('should label a modern Anchor IDL with the standard-era wildcard', () => {
        expect(getIdlVersion(anchorIdl)).toBe(MODERN_ANCHOR_IDL_WILDCARD);
    });

    it('should return the format version from metadata.spec', () => {
        expect(getIdlFormatVersion(anchorIdl)).toBe('0.1.0');
    });

    it('should return the program version from metadata.version', () => {
        expect(getIdlProgramVersion(anchorIdl)).toBe('1.2.3');
    });
});
