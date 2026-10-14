import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-1971): review-only switch for the footer's "Custom IDLs" link; remove with the design menu.

export const customIdlCatalogVisibleAtom = atomWithStorage('hoo-1971:catalog-visible', true);

export function useCustomIdlCatalogVisible(): boolean {
    return useAtomValue(customIdlCatalogVisibleAtom);
}
