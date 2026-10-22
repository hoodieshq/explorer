'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

// REVIEW(HOO-921): the NFT header variants under review. Remove this module, and every variant that loses, before
// the external PR.

const NFT_HEADER_VARIANTS = [{ label: 'Original', value: 'original' }] as const;

export type NftHeaderVariant = (typeof NFT_HEADER_VARIANTS)[number]['value'];

// The default stays in code: a reviewer who never flipped the switch gets a changed default too.
const DEFAULT_NFT_HEADER_VARIANT: NftHeaderVariant = 'original';

const nftHeaderVariantAtom = atomWithStorage<NftHeaderVariant | undefined>('hoo-921:nft-header', undefined);

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
        </DesignMenuSection>
    );
}
