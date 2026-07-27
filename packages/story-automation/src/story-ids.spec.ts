import { describe, expect, it } from 'vitest';

import { storyIdsFromIndex } from './story-ids.js';

describe('storyIdsFromIndex', () => {
    it('should drop docs entries and keep stories', () => {
        const ids = storyIdsFromIndex({
            entries: {
                'a--default': { id: 'a--default', type: 'story' },
                'a--docs': { id: 'a--docs', type: 'docs' },
            },
            v: 5,
        });

        expect(ids).toEqual(['a--default']);
    });

    it('should treat entries without a type as stories', () => {
        const ids = storyIdsFromIndex({ entries: { 'a--default': { id: 'a--default' } } });

        expect(ids).toEqual(['a--default']);
    });

    it('should return ids sorted', () => {
        const ids = storyIdsFromIndex({
            entries: {
                'a--first': { id: 'a--first', type: 'story' },
                'z--last': { id: 'z--last', type: 'story' },
            },
        });

        expect(ids).toEqual(['a--first', 'z--last']);
    });
});
