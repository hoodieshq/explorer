import { describe, expect, it } from 'vitest';

import { keepInViewport, placeInViewport, SQUEEZED_EDGE_GAP } from '../place-in-viewport';

const button = { height: 40, width: 40 };

describe('placeInViewport', () => {
    it('should keep the chosen spot while the window holds it', () => {
        expect(placeInViewport({ left: 5, top: 700 }, button, { height: 800, width: 1200 })).toEqual({
            left: 5,
            top: 700,
        });
    });

    it('should move the button to the gap from the edge the window squeezes it past', () => {
        expect(placeInViewport({ left: 1100, top: 700 }, button, { height: 600, width: 1000 })).toEqual({
            left: 1000 - 40 - SQUEEZED_EDGE_GAP,
            top: 600 - 40 - SQUEEZED_EDGE_GAP,
        });
    });

    it('should return to the chosen spot once the window grows back', () => {
        const chosen = { left: 1100, top: 700 };
        placeInViewport(chosen, button, { height: 600, width: 1000 });

        expect(placeInViewport(chosen, button, { height: 900, width: 1400 })).toEqual(chosen);
    });
});

describe('keepInViewport', () => {
    it('should let a dragged button reach the edge but not cross it', () => {
        expect(keepInViewport({ left: -30, top: 900 }, button, { height: 800, width: 1200 })).toEqual({
            left: 0,
            top: 760,
        });
    });
});
