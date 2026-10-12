import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-1971): the inner review compares ways to mark custom-IDL values; remove with the design menu once the
// team picks one.

/**
 * `marker`: a background on each value. `row`: a tint on the table row or card header the value sits in. `off`: no
 * mark on values, rows or cards; only the IDL selector shows that the custom IDL is selected.
 */
export type CustomIdlHighlightVariant = 'marker' | 'row' | 'off';

export const CUSTOM_IDL_HIGHLIGHT_VARIANTS: readonly CustomIdlHighlightVariant[] = ['marker', 'row', 'off'];

export const customIdlHighlightVariantAtom = atomWithStorage<CustomIdlHighlightVariant>(
    'hoo-1971:highlight-variant',
    'off',
);

export function useCustomIdlHighlightVariant(): CustomIdlHighlightVariant {
    return useAtomValue(customIdlHighlightVariantAtom);
}
