import { describe, expect, it } from 'vitest';

import {
    getIdlFormatVersion,
    getIdlProgramVersion,
    getIdlStandard,
    getIdlVersion,
    isCodamaIdl,
    isSupportedIdl,
} from '../../detect';
import { IdlStandard } from '../../types';
import { anchorIdl, codamaIdl } from '../fixtures';

describe('isCodamaIdl', () => {
    it('should accept a Codama root node', () => {
        expect(isCodamaIdl(codamaIdl)).toBe(true);
        expect(isSupportedIdl(codamaIdl)).toBe(true);
    });

    it('should reject an Anchor IDL', () => {
        expect(isCodamaIdl(anchorIdl)).toBe(false);
    });

    it('should reject a rootNode-shaped value without a program node', () => {
        expect(isCodamaIdl({ kind: 'rootNode' })).toBe(false);
    });

    it.each([null, undefined, 42, 'idl', {}, []])('should reject non-IDL input %#', value => {
        expect(isCodamaIdl(value)).toBe(false);
    });
});

describe('Codama version helpers', () => {
    it('should identify the Codama standard', () => {
        expect(getIdlStandard(codamaIdl)).toBe(IdlStandard.Codama);
    });

    it('should return the root version as the standard-era label', () => {
        expect(getIdlVersion(codamaIdl)).toBe(codamaIdl.version);
    });

    it('should return the format version from the root version', () => {
        expect(getIdlFormatVersion(codamaIdl)).toBe(codamaIdl.version);
    });

    it('should return the program version from program.version', () => {
        expect(getIdlProgramVersion(codamaIdl)).toBe('1.0.0');
    });
});
