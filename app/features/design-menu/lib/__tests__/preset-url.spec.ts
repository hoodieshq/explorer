import { describe, expect, it } from 'vitest';

import { presetEntries, replacePreset } from '../preset-url';

const names = ['design-layout', 'design-previews'];

describe('presetEntries', () => {
    it('should return the preset parameters the query sets, in the order of the names', () => {
        expect(presetEntries('?design-previews=abstract&cluster=devnet&design-layout=grid', names)).toEqual([
            ['design-layout', 'grid'],
            ['design-previews', 'abstract'],
        ]);
    });

    it('should leave out missing and empty parameters', () => {
        expect(presetEntries('?design-layout=&cluster=devnet', names)).toEqual([]);
    });
});

describe('replacePreset', () => {
    it('should replace the preset parameters and keep the others', () => {
        expect(
            replacePreset(
                '?cluster=devnet&design-layout=row',
                [
                    ['design-layout', 'cards'],
                    ['design-previews', 'simple'],
                ],
                names,
            ),
        ).toBe('?cluster=devnet&design-layout=cards&design-previews=simple');
    });

    it('should return an empty string when no parameter is left', () => {
        expect(replacePreset('?design-layout=row', [], names)).toBe('');
    });
});
