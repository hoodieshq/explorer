import { describe, expect, it } from 'vitest';

import { convertToCodama } from '../convert';
import { isCodamaIdl } from '../detect';
import { anchorIdl, codamaIdl } from './fixtures';

describe('convertToCodama', () => {
    it('should pass a Codama root through unchanged', () => {
        const [error, converted] = convertToCodama(codamaIdl);
        expect(error).toBeUndefined();
        expect(converted).toBe(codamaIdl);
    });

    it('should normalize a modern Anchor document into a Codama root', () => {
        const [error, converted] = convertToCodama(anchorIdl);
        expect(error).toBeUndefined();
        expect(converted && isCodamaIdl(converted)).toBe(true);
        expect(converted?.program.name).toBe('counter');
    });
});
