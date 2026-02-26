import { describe, expect, it } from 'vitest';

import { BlupryntStatus, parseApiResponse } from '../use-bluprynt';

describe('parseApiResponse', () => {
    it('should return Success status when verified is true', () => {
        const result = parseApiResponse({ verified: true });

        expect(result.status).toBe(BlupryntStatus.Success);
        expect(result.verified).toBe(true);
    });

    it('should return NotFound status when verified is false', () => {
        const result = parseApiResponse({ verified: false });

        expect(result.status).toBe(BlupryntStatus.NotFound);
        expect(result.verified).toBe(false);
    });
});
