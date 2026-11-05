import { describe, expect, it } from 'vitest';

import { findMatches } from '../find-matches';

describe('findMatches', () => {
    it('should find every occurrence regardless of case', () => {
        expect(findMatches('Stake and unstake', 'STAKE')).toEqual([
            [0, 5],
            [12, 17],
        ]);
    });

    it('should not overlap matches', () => {
        expect(findMatches('aaaa', 'aa')).toEqual([
            [0, 2],
            [2, 4],
        ]);
    });

    it('should find nothing for a blank query or a missing one', () => {
        expect(findMatches('Stake', '  ')).toEqual([]);
        expect(findMatches('Stake', 'vote')).toEqual([]);
    });

    it('should trim the query as the search does', () => {
        expect(findMatches('Stake', ' stake ')).toEqual([[0, 5]]);
    });
});
