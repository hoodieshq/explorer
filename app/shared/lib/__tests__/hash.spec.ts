import { describe, expect, it } from 'vitest';

import { fromUtf8 } from '../bytes';
import { sha256Hex } from '../hash';

describe('sha256Hex', () => {
    it('should hash the empty input to the published sha256 vector', () => {
        expect(sha256Hex(new Uint8Array(0))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should hash a short known string to the published sha256 vector', () => {
        expect(sha256Hex(fromUtf8('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });
});
