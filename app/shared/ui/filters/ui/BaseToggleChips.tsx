import { cva } from 'class-variance-authority';

import { toggleSelection } from '../lib/toggle-selection';

export type ToggleChipOption = { count?: number; label: string; value: string };

type Props = {
    className?: string;
    // Receives every picked value after a click, in option order; empty when the click leaves none picked.
    onChange: (selected: string[]) => void;
    options: ToggleChipOption[];
    selected: readonly string[];
};

/**
 * Toggles instead of an "Any …" list: each chip flips on its own. What several picks mean (any of them, or no
 * filter when all are picked) is the caller's to decide.
 */
export function BaseToggleChips({ className, onChange, options, selected }: Props) {
    const optionValues = options.map(({ value }) => value);

    return (
        // `flex-wrap-reverse`: chips fill the bottom row left to right and overflow wraps upward.
        <div className={className ?? 'flex flex-wrap-reverse gap-2'}>
            {options.map(({ count, label, value }) => {
                const isSelected = selected.includes(value);
                return (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onChange(toggleSelection(optionValues, selected, value))}
                        className={toggleChipVariants({ selected: isSelected })}
                    >
                        {/* Baseline-aligned inside, so the smaller count sits on the label's line; the chip itself
                            centres this run in its fixed height. */}
                        <span className="flex items-baseline gap-1.5">
                            {label}
                            {count !== undefined && <span className="text-xs text-outer-space-300">{count}</span>}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// The 32px filter control (`box-border` holds it where no reset sets border-box, as in Storybook), with `rounded`
// (4px), the corner of the app's buttons and inputs, rather than a full pill. No Preflight here, so the
// button's UA background and font family are reset by hand; the background sits in each variant because `cn`
// doesn't dedupe two background utilities.
const toggleChipVariants = cva(
    'box-border inline-flex h-8 cursor-pointer items-center rounded border border-solid px-3 text-sm [font-family:inherit] hover:text-white',
    {
        variants: {
            selected: {
                false: 'border-outer-space-800 bg-transparent text-dark-muted-foreground hover:border-white/20',
                true: 'border-accent bg-white/5 text-white',
            },
        },
    },
);
