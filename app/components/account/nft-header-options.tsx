'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

// REVIEW(HOO-921): smaller choices inside the NFT header variants: where "View original" goes, and how the card
// header spaces its text. Remove this module, and the variants that lose, before the external PR.

export const ORIGINAL_LINK_VARIANTS = [
    // Beside the type label (Card), in the title row (Split), under the art (Wide Art).
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

export type NftOriginalLinkPlacement = (typeof ORIGINAL_LINK_VARIANTS)[number]['value'];
export type NftCardSpacing = (typeof CARD_SPACING_VARIANTS)[number]['value'];

export const ORIGINAL_LINK_STORAGE_KEY = 'hoo-921:original-link';
export const CARD_SPACING_STORAGE_KEY = 'hoo-921:card-spacing';

const originalLinkAtom = atomWithStorage<NftOriginalLinkPlacement | undefined>(ORIGINAL_LINK_STORAGE_KEY, undefined);
const cardSpacingAtom = atomWithStorage<NftCardSpacing | undefined>(CARD_SPACING_STORAGE_KEY, undefined);

/** Whether the design menu shows these choices and the creators ones, folded under "Settings" by default. */
export const nftSettingsOpenAtom = atomWithStorage('hoo-921:settings-open', false);

export function useNftOriginalLinkPlacement(): NftOriginalLinkPlacement {
    const stored = useAtomValue(originalLinkAtom);
    // A value dropped from the list may still sit in a reviewer's storage.
    return ORIGINAL_LINK_VARIANTS.find(variant => variant.value === stored)?.value ?? 'row';
}

export function useNftCardSpacing(): NftCardSpacing {
    const stored = useAtomValue(cardSpacingAtom);
    return CARD_SPACING_VARIANTS.find(variant => variant.value === stored)?.value ?? 'centred';
}

/** The HOO-921 header option sections of the design menu. */
export function NftHeaderOptionSections() {
    const originalLink = useNftOriginalLinkPlacement();
    const cardSpacing = useNftCardSpacing();
    const setOriginalLink = useSetAtom(originalLinkAtom);
    const setCardSpacing = useSetAtom(cardSpacingAtom);
    return (
        <>
            <DesignMenuSection title="View original">
                <DesignMenuOptions options={ORIGINAL_LINK_VARIANTS} value={originalLink} onChange={setOriginalLink} />
            </DesignMenuSection>
            <DesignMenuSection title="Card text">
                <DesignMenuOptions options={CARD_SPACING_VARIANTS} value={cardSpacing} onChange={setCardSpacing} />
            </DesignMenuSection>
        </>
    );
}
