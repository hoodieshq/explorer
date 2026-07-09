import { describe, expect, it } from 'vitest';

import { isAnchorIdl, isLegacyAnchorIdl, isSupportedIdl } from '../../detect';
import { loadNtt029Idl, loadSimpleIdl, loadTokenkegIdl, pre030AnchorIdl } from '../fixtures';

describe('isLegacyAnchorIdl', () => {
    it('should recognize a legacy Anchor IDL', () => {
        expect(isLegacyAnchorIdl(pre030AnchorIdl)).toBe(true);
    });

    it('should recognize a real anchor-0.29 IDL (wormhole NTT) as legacy, not supported', () => {
        const ntt = loadNtt029Idl();
        expect(isLegacyAnchorIdl(ntt)).toBe(true);
        expect(isAnchorIdl(ntt)).toBe(false);
        expect(isSupportedIdl(ntt)).toBe(false);
    });

    it('should stay outside the supported set', () => {
        expect(isSupportedIdl(pre030AnchorIdl)).toBe(false);
    });

    it('should reject both supported standards', () => {
        expect(isLegacyAnchorIdl(loadSimpleIdl())).toBe(false);
        expect(isLegacyAnchorIdl(loadTokenkegIdl())).toBe(false);
    });

    it.each([null, undefined, 42, 'idl', {}, []])('should reject non-IDL input %#', value => {
        expect(isLegacyAnchorIdl(value)).toBe(false);
    });
});
