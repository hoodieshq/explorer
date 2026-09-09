import { describe, expect, it } from 'vitest';

import { loadOgFonts } from '../og-fonts';

describe('og-fonts', () => {
    it('should return both families at 400, 500 and 600', async () => {
        const fonts = await loadOgFonts();

        expect(fonts.map(({ name, weight }) => `${name} ${weight}`)).toEqual([
            'Rubik 400',
            'Rubik 500',
            'Rubik 600',
            'Roboto Mono 400',
            'Roboto Mono 500',
            'Roboto Mono 600',
        ]);
    });

    it('should lead with Rubik, which is what makes it default family', async () => {
        const [first] = await loadOgFonts();

        expect(first.name).toBe('Rubik');
    });
});
