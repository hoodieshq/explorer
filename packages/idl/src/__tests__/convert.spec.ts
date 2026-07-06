import { describe, expect, it } from 'vitest';

import { convertToCodama } from '../convert';
import { isCodamaIdl } from '../detect';
import { IDL_ERROR__IDL_PARSE_FAILED } from '../errors';
import type { AnchorIdl } from '../types';
import { loadSimpleIdl } from './fixtures';

describe('convertToCodama', () => {
    it('should normalize a modern Anchor document into a Codama root', () => {
        const [error, converted] = convertToCodama(loadSimpleIdl());
        expect(error).toBeUndefined();
        expect(converted && isCodamaIdl(converted)).toBe(true);
        expect(converted?.program.name).toBe('simple');
    });

    it('should return the parse-failed error for a document the converter cannot handle', () => {
        const broken = {
            instructions: [{ args: [{ name: 'x', type: 'not-a-type' }], name: 'boom' }],
        } as unknown as AnchorIdl;
        const [error, converted] = convertToCodama(broken);
        expect(converted).toBeUndefined();
        expect(error?.code).toBe(IDL_ERROR__IDL_PARSE_FAILED);
    });
});
