import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-1971): the inner review compares two ways to mark custom-IDL values; remove with the footer picker
// once the team picks one.

/** `marker`: a background on each value. `row`: a tint on the table row or card header the value sits in. */
export type CustomIdlHighlightVariant = 'marker' | 'row';

export const CUSTOM_IDL_HIGHLIGHT_VARIANTS: readonly CustomIdlHighlightVariant[] = ['marker', 'row'];

export const customIdlHighlightVariantAtom = atomWithStorage<CustomIdlHighlightVariant>(
    'hoo-1971:highlight-variant',
    'row',
);

export function useCustomIdlHighlightVariant(): CustomIdlHighlightVariant {
    return useAtomValue(customIdlHighlightVariantAtom);
}
