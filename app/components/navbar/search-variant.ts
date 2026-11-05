'use client';

import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-935): the design-menu switch for the navbar search on phones (below `sm`); remove with the losing variant
// before the external PR. `button` is the search icon that expands into a full-width field; `field` shows the field
// right away in the button's place, stretched over the room between the logo and the cluster switcher, and still
// expands to the full width while it has focus.
export type NavSearchVariant = 'button' | 'field';

export const navSearchVariantAtom = atomWithStorage<NavSearchVariant>('hoo-935:nav-search', 'button');

export function useNavSearchVariant() {
    return useAtomValue(navSearchVariantAtom);
}
