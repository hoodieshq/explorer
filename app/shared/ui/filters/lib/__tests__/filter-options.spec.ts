import { describe, expect, it } from 'vitest';

import { filterOptions } from '../filter-options';

const OPTIONS = [
    { label: 'Token Program', value: 'token' },
    { label: 'Associated Token Program', value: 'ata' },
    { label: 'System Program', value: 'system' },
];

describe('filterOptions', () => {
    it('should keep every option for an empty or blank query', () => {
        expect(filterOptions(OPTIONS, '')).toEqual(OPTIONS);
        expect(filterOptions(OPTIONS, '   ')).toEqual(OPTIONS);
    });

    it('should match a label substring regardless of case', () => {
        expect(filterOptions(OPTIONS, 'TOKEN').map(({ value }) => value)).toEqual(['token', 'ata']);
    });

    it('should return nothing when no label matches', () => {
        expect(filterOptions(OPTIONS, 'vote')).toEqual([]);
    });
});
