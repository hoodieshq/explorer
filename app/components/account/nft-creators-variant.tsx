'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

// REVIEW(HOO-921): where the NFT's creators list goes and how it shows an unverified creator and the royalty shares. Remove this
// module, and the variants that lose, before the external PR.

export const UNVERIFIED_VARIANTS = [
    // Below `sm` a question mark with the explanation on a tap; the text from `sm`.
    { label: 'Icon on phones', value: 'icon' },
    { label: 'Text', value: 'text' },
] as const;

export const SHARE_VARIANTS = [
    // The shares in a column of their own, after the longest address.
    { label: 'Column', value: 'column' },
    // The share right after its address, on the next line when the two don't fit.
    { label: 'Inline', value: 'inline' },
] as const;

export const PLACEMENT_VARIANTS = [
    { label: 'Header', value: 'header' },
    // A row of the Overview card, before Website; the header drops its Creators row.
    { label: 'Overview', value: 'overview' },
] as const;

export type NftCreatorsPlacement = (typeof PLACEMENT_VARIANTS)[number]['value'];
export type NftCreatorsUnverified = (typeof UNVERIFIED_VARIANTS)[number]['value'];
export type NftCreatorsShare = (typeof SHARE_VARIANTS)[number]['value'];

export const UNVERIFIED_STORAGE_KEY = 'hoo-921:creators-unverified';
export const SHARE_STORAGE_KEY = 'hoo-921:creators-share';
export const PLACEMENT_STORAGE_KEY = 'hoo-921:creators-placement';

const unverifiedAtom = atomWithStorage<NftCreatorsUnverified | undefined>(UNVERIFIED_STORAGE_KEY, undefined);
const shareAtom = atomWithStorage<NftCreatorsShare | undefined>(SHARE_STORAGE_KEY, undefined);
const placementAtom = atomWithStorage<NftCreatorsPlacement | undefined>(PLACEMENT_STORAGE_KEY, undefined);

/** Where the creators list goes; the header and the Overview card both ask, so only one of them shows it. */
export function useNftCreatorsPlacement(): NftCreatorsPlacement {
    const stored = useAtomValue(placementAtom);
    return PLACEMENT_VARIANTS.find(variant => variant.value === stored)?.value ?? 'overview';
}

export function useNftCreatorsUnverified(): NftCreatorsUnverified {
    const stored = useAtomValue(unverifiedAtom);
    // A value dropped from the list may still sit in a reviewer's storage.
    return UNVERIFIED_VARIANTS.find(variant => variant.value === stored)?.value ?? 'text';
}

export function useNftCreatorsShare(): NftCreatorsShare {
    const stored = useAtomValue(shareAtom);
    return SHARE_VARIANTS.find(variant => variant.value === stored)?.value ?? 'inline';
}

/** The HOO-921 creators sections of the design menu. */
export function NftCreatorsVariantSections() {
    const placement = useNftCreatorsPlacement();
    const unverified = useNftCreatorsUnverified();
    const share = useNftCreatorsShare();
    const setPlacement = useSetAtom(placementAtom);
    const setUnverified = useSetAtom(unverifiedAtom);
    const setShare = useSetAtom(shareAtom);
    return (
        <>
            <DesignMenuSection title="Creators in">
                <DesignMenuOptions options={PLACEMENT_VARIANTS} value={placement} onChange={setPlacement} />
            </DesignMenuSection>
            <DesignMenuSection title="Unverified creator">
                <DesignMenuOptions options={UNVERIFIED_VARIANTS} value={unverified} onChange={setUnverified} />
            </DesignMenuSection>
            <DesignMenuSection title="Creator share">
                <DesignMenuOptions options={SHARE_VARIANTS} value={share} onChange={setShare} />
            </DesignMenuSection>
        </>
    );
}
