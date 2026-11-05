import { atomWithStorage } from 'jotai/utils';

import { type Point } from '../lib/place-in-viewport';

// Read on init: the button renders only in the browser, and it must not appear at the default spot and then jump.
/** The spot the user last dragged the design-menu button to; undefined until the first drag. */
export const designMenuPositionAtom = atomWithStorage<Point | undefined>('design-menu:position', undefined, undefined, {
    getOnInit: true,
});
