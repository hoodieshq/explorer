import { describe, expect, it } from 'vitest';

import { toggleSelection } from '../toggle-selection';

const OPTIONS = ['legacy', '0', '1'];

describe('toggleSelection', () => {
    it('should add an unpicked value', () => {
        expect(toggleSelection(OPTIONS, [], '0')).toEqual(['0']);
    });

    it('should remove a picked value', () => {
        expect(toggleSelection(OPTIONS, ['legacy', '0'], 'legacy')).toEqual(['0']);
    });

    it('should keep option order regardless of click order', () => {
        expect(toggleSelection(OPTIONS, ['1'], 'legacy')).toEqual(['legacy', '1']);
    });

    it('should drop picked values that are no longer options', () => {
        expect(toggleSelection(OPTIONS, ['2', '0'], '1')).toEqual(['0', '1']);
    });
});
