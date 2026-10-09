'use client';

import { cva } from 'class-variance-authority';
import { useAtom } from 'jotai';

import {
    CUSTOM_IDL_HIGHLIGHT_VARIANTS,
    type CustomIdlHighlightVariant,
    customIdlHighlightVariantAtom,
} from '../model/custom-idl/highlight-variant';

// REVIEW(HOO-1971): review-only switch between the two custom-IDL highlight variants; remove before the external PR.

/** Footer switch between the custom-IDL highlight variants, kept in this browser. */
export function CustomIdlHighlightPicker() {
    const [variant, setVariant] = useAtom(customIdlHighlightVariantAtom);
    return (
        <span role="group" aria-label="IDL highlight" className="flex items-center gap-2">
            <span className="text-heavy-metal-400">IDL highlight:</span>
            {CUSTOM_IDL_HIGHLIGHT_VARIANTS.map(option => (
                <button
                    key={option}
                    type="button"
                    aria-pressed={variant === option}
                    onClick={() => setVariant(option)}
                    className={optionVariants({ selected: variant === option })}
                >
                    {LABELS[option]}
                </button>
            ))}
        </span>
    );
}

const LABELS: Record<CustomIdlHighlightVariant, string> = { marker: 'Marker', row: 'Rows' };

const optionVariants = cva('cursor-pointer border-0 bg-transparent p-0 transition-colors', {
    variants: {
        selected: {
            false: 'text-inherit hover:text-accent-500',
            true: 'text-white',
        },
    },
});
