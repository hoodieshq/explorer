import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-929): smaller choices inside the NFToken header variants, as in HOO-921's menu: where "View original"
// goes, and how the card header spaces its text. In shared for the same reason as `nftoken-header-variant`. Remove
// this module, and the choices that lose, before the external PR.

export const ORIGINAL_LINK_VARIANTS = [
    // Beside the type label (Card, Split), under the art (Plain).
    { label: 'Current', value: 'current' },
    // A row of the header's own label / value list, after the others.
    { label: 'Row', value: 'row' },
] as const;

export const CARD_SPACING_VARIANTS = [
    // The name at the top beside the art, the facts at its bottom, the art's spare height between them.
    { label: 'Stretch', value: 'stretch' },
    // A fixed gap between the name and the facts, the two centred beside the art.
    { label: 'Centred', value: 'centred' },
] as const;

export type NftokenOriginalLinkPlacement = (typeof ORIGINAL_LINK_VARIANTS)[number]['value'];
export type NftokenCardSpacing = (typeof CARD_SPACING_VARIANTS)[number]['value'];

export const ORIGINAL_LINK_STORAGE_KEY = 'hoo-929:original-link';
export const CARD_SPACING_STORAGE_KEY = 'hoo-929:card-spacing';

export const originalLinkPlacementAtom = atomWithStorage<NftokenOriginalLinkPlacement | undefined>(
    ORIGINAL_LINK_STORAGE_KEY,
    undefined,
);
export const cardSpacingAtom = atomWithStorage<NftokenCardSpacing | undefined>(CARD_SPACING_STORAGE_KEY, undefined);

/** Whether the design menu shows these choices, folded under "Settings" by default. */
export const nftokenSettingsOpenAtom = atomWithStorage('hoo-929:settings-open', false);

export function useNftokenOriginalLinkPlacement(): NftokenOriginalLinkPlacement {
    const stored = useAtomValue(originalLinkPlacementAtom);
    // A value dropped from the list may still sit in a reviewer's storage.
    return ORIGINAL_LINK_VARIANTS.find(variant => variant.value === stored)?.value ?? 'row';
}

export function useNftokenCardSpacing(): NftokenCardSpacing {
    const stored = useAtomValue(cardSpacingAtom);
    return CARD_SPACING_VARIANTS.find(variant => variant.value === stored)?.value ?? 'centred';
}
