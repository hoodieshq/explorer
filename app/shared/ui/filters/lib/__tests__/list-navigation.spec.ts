import { describe, expect, it } from 'vitest';

import { moveActive } from '../list-navigation';

const VALUES = ['all', 'vote', 'token'];

describe('moveActive', () => {
    it('should step down and up', () => {
        expect(moveActive(VALUES, 'all', 1)).toBe('vote');
        expect(moveActive(VALUES, 'token', -1)).toBe('vote');
    });

    it('should hold at the ends instead of wrapping', () => {
        expect(moveActive(VALUES, 'token', 1)).toBe('token');
        expect(moveActive(VALUES, 'all', -10)).toBe('all');
    });

    it('should start from the first option going down, or the last going up, when nothing is active', () => {
        expect(moveActive(VALUES, undefined, 1)).toBe('all');
        expect(moveActive(VALUES, 'gone', -1)).toBe('token');
    });

    it('should land nowhere in an empty list', () => {
        expect(moveActive([], 'all', 1)).toBeUndefined();
    });
});
