import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(home-key-value-cards): the two ways a section's title link fits beside a title on a phone, switched from the
// design menu. Keep the chosen one and delete this module with the menu before the external PR.

export type SectionActionsVariant = 'icon' | 'wrap';

/** `wrap` moves the link under the title when the row cannot hold both; `icon` turns it into an icon button below `sm`. */
// Read after mount (no `getOnInit`), so the server render and hydration agree; a stored `icon` swaps in a frame later.
export const sectionActionsVariantAtom = atomWithStorage<SectionActionsVariant>(
    'home-key-value-cards:section-actions',
    'wrap',
);

export function useSectionActionsVariant() {
    return useAtomValue(sectionActionsVariantAtom);
}

/** The title-row layout each variant needs from `CollapsibleSection`. */
export function useSectionActionsLayout() {
    return useSectionActionsVariant() === 'icon' ? 'top' : 'wrap';
}
