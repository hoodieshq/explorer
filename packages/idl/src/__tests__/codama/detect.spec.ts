import { describe, expect, it } from 'vitest';

import {
    getIdlProgramAddress,
    getIdlProgramVersion,
    getIdlStandard,
    getIdlVersion,
    isCodamaIdl,
    isSupportedIdl,
} from '../../detect';
import { IdlStandard, type SupportedIdl } from '../../types';
import { loadSimpleIdl, loadTokenkegIdl } from '../fixtures';

describe('isCodamaIdl', () => {
    it('should accept a Codama root node', () => {
        const tokenkeg = loadTokenkegIdl();
        expect(isCodamaIdl(tokenkeg)).toBe(true);
        expect(isSupportedIdl(tokenkeg)).toBe(true);
    });

    it('should reject an Anchor IDL', () => {
        expect(isCodamaIdl(loadSimpleIdl())).toBe(false);
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
        expect(getIdlStandard(loadTokenkegIdl())).toBe(IdlStandard.Codama);
    });

    it('should return the root version as the format version', () => {
        const tokenkeg = loadTokenkegIdl();
        expect(getIdlVersion(tokenkeg)).toBe(tokenkeg.version);
    });

    it('should return the program version from program.version', () => {
        expect(getIdlProgramVersion(loadTokenkegIdl())).toBe('3.3.0');
    });

    it('should return undefined when runtime Codama metadata omits optional program fields', () => {
        const idl = { kind: 'rootNode', program: {} } as unknown as SupportedIdl;
        expect(getIdlProgramAddress(idl)).toBeUndefined();
        expect(getIdlProgramVersion(idl)).toBeUndefined();
    });
});
