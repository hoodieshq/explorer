import type React from 'react';
import { RotateCcw } from 'react-feather';

type Props = {
    // Names what gets cleared, for screen readers and the hover tooltip: "Clear status filter".
    'aria-label': string;
    // Shown beside the icon when the icon alone would be ambiguous, as for clearing the whole form.
    label?: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

/**
 * The one control for clearing filters, a section's or the whole form's: a counter-clockwise arrow, back to the
 * default, so it doesn't read as the cross that closes a panel or removes a pill.
 */
export function BaseResetButton({ 'aria-label': ariaLabel, label, onClick }: Props) {
    return (
        // No Preflight here, so the button's UA border, background and font family are reset by hand.
        <button
            type="button"
            data-filter-reset
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={onClick}
            className="inline-flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-sm border-0 bg-transparent px-1 text-xs text-outer-space-300 [font-family:inherit] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
            <RotateCcw size={12} aria-hidden />
            {label}
        </button>
    );
}
