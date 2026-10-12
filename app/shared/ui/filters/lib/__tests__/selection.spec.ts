import { describe, expect, it, vi } from 'vitest';

import { selectionHandlers } from '../selection';

const VALUES = ['legacy', '0', '1'];

describe('selectionHandlers', () => {
    it('should replace a single choice with the clicked value', () => {
        const onChange = vi.fn();
        const { isSelected, pick } = selectionHandlers({ onChange, selected: ['0'] }, VALUES);

        expect(isSelected('0')).toBe(true);
        expect(isSelected('1')).toBe(false);
        pick('1');
        expect(onChange).toHaveBeenCalledWith(['1']);
        pick('0');
        expect(onChange).toHaveBeenLastCalledWith(['0']);
    });

    it('should toggle a value within several picks, in option order', () => {
        const onChange = vi.fn();
        const { isSelected, pick } = selectionHandlers({ multiple: true, onChange, selected: ['1'] }, VALUES);

        expect(isSelected('1')).toBe(true);
        pick('legacy');
        expect(onChange).toHaveBeenCalledWith(['legacy', '1']);
        pick('1');
        expect(onChange).toHaveBeenLastCalledWith([]);
    });
});
