import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(home-key-value-cards): layouts for the developer resources block, switched from the design menu. Keep the
// chosen one and delete this module with the menu before the external PR.

export type ResourcesLayout = 'cards' | 'featured' | 'grid' | 'list' | 'row';

/**
 * `row` scrolls image cards sideways; `cards` scrolls bordered cards, as in an NFT collection, fading out the ones
 * that do not fit; `grid` shows every card at once; `list` drops the images for title and
 * description rows; `featured` puts the first link in a large card and lists the rest beside it. Read after mount
 * (no `getOnInit`), so the server render and hydration agree.
 */
export const resourcesLayoutAtom = atomWithStorage<ResourcesLayout>('home-key-value-cards:resources-layout', 'cards');

export function useResourcesLayout() {
    return useAtomValue(resourcesLayoutAtom);
}

export type ResourcesPreview = 'abstract' | 'detailed' | 'simple';

/** How much the card previews draw: the full diagrams, the same ones with fewer parts, or shapes without text. */
export const resourcesPreviewAtom = atomWithStorage<ResourcesPreview>(
    'home-key-value-cards:resources-preview',
    'simple',
);

export function useResourcesPreview() {
    return useAtomValue(resourcesPreviewAtom);
}
