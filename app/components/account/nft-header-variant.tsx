'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

// REVIEW(HOO-921): the NFT header variants under review. Remove this module, and every variant that loses, before
// the external PR.

export const NFT_HEADER_VARIANTS = [
    { label: 'Wide Art', value: 'wideArt' },
    // Card and Split come from HOO-929's NFToken header: the header on a card, or cut into an art card and a text card.
    { label: 'Card', value: 'card' },
    // The primary variant: starred in the menu, which also says so under the buttons.
    { label: 'Split', primary: true, value: 'split' },
] as const;

export type NftHeaderVariant = (typeof NFT_HEADER_VARIANTS)[number]['value'];

// The default stays in code: a reviewer who never flipped the switch gets a changed default too.
const DEFAULT_NFT_HEADER_VARIANT: NftHeaderVariant = 'split';

export const NFT_HEADER_STORAGE_KEY = 'hoo-921:nft-header';

const nftHeaderVariantAtom = atomWithStorage<NftHeaderVariant | undefined>(NFT_HEADER_STORAGE_KEY, undefined);

/** The header variant both NFT headers render, so the switch changes the regular and the compressed page at once. */
export function useNftHeaderVariant(): NftHeaderVariant {
    const stored = useAtomValue(nftHeaderVariantAtom);
    // A variant dropped from the list may still sit in a reviewer's storage.
    return NFT_HEADER_VARIANTS.find(variant => variant.value === stored)?.value ?? DEFAULT_NFT_HEADER_VARIANT;
}

/** The HOO-921 section of the design menu. */
export function NftHeaderVariantSection() {
    const variant = useNftHeaderVariant();
    const setVariant = useSetAtom(nftHeaderVariantAtom);
    return (
        <DesignMenuSection title="NFT header">
            <DesignMenuOptions options={NFT_HEADER_VARIANTS} value={variant} onChange={setVariant} />
            <p className="m-0 text-xs text-outer-space-300">
                <span className="text-dark-accent">★</span> Primary
            </p>
        </DesignMenuSection>
    );
}
