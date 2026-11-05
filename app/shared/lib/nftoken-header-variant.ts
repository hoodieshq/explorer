import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-929): the NFToken header's layout, switched from the design menu while the team compares the layouts. It
// lives in shared because both the `nftoken` feature (which draws the header) and the `design-menu` feature (which
// switches it) read it, and one feature may not import another. Remove with the variants that lose.

export const NFTOKEN_HEADER_VARIANTS = [
    { label: 'Plain', value: 'plain' },
    { label: 'Card', value: 'card' },
    // The primary variant: starred in the menu, which also says so under the buttons.
    { label: 'Split', primary: true, value: 'split' },
] as const;

export type NftokenHeaderVariant = (typeof NFTOKEN_HEADER_VARIANTS)[number]['value'];

// The default stays in code: a reviewer who never flipped the switch gets a changed default too.
const DEFAULT_NFTOKEN_HEADER_VARIANT: NftokenHeaderVariant = 'split';

export const NFTOKEN_HEADER_STORAGE_KEY = 'hoo-929:nftoken-header';

export const nftokenHeaderVariantAtom = atomWithStorage<NftokenHeaderVariant | undefined>(
    NFTOKEN_HEADER_STORAGE_KEY,
    undefined,
);

/** The header variant the NFToken pages render: the reviewer's pick, or the primary one. */
export function useNftokenHeaderVariant(): NftokenHeaderVariant {
    const stored = useAtomValue(nftokenHeaderVariantAtom);
    // A variant dropped from the list may still sit in a reviewer's storage.
    return NFTOKEN_HEADER_VARIANTS.find(variant => variant.value === stored)?.value ?? DEFAULT_NFTOKEN_HEADER_VARIANT;
}
