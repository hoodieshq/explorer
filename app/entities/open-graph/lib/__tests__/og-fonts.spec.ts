import { describe, expect, it } from 'vitest';

import { loadOgFonts } from '../og-fonts';

// Exercises the real file read. The route specs mock this loader, so without a test that actually reads the
// TTFs a broken read reaches production as a share image silently drawn in satori's Noto Sans.
describe('should load the OG fonts', () => {
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

    it('should lead with Rubik, which is what makes it satori default family', async () => {
        const [first] = await loadOgFonts();

        expect(first.name).toBe('Rubik');
    });

    it('should read real font bytes for every face', async () => {
        const fonts = await loadOgFonts();

        for (const font of fonts) {
            // `00 01 00 00` is the TrueType version tag every one of these files opens with.
            expect([...new Uint8Array(font.data).slice(0, 4)]).toEqual([0, 1, 0, 0]);
        }
    });

    it('should read the files once across calls', async () => {
        const first = await loadOgFonts();
        const second = await loadOgFonts();

        expect(second).toBe(first);
    });
});
