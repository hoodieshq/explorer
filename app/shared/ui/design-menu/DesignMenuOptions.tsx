'use client';

import { Button } from '@components/shared/ui/button';

// REVIEW(design-menu): part of the review-only design menu; remove with it.

/** One pick among a few variants, as a row of buttons; the picked one has the pressed look of the cards' Raw toggle. */
export function DesignMenuOptions<T extends string>({
    options,
    value,
    onChange,
}: {
    options: readonly { label: string; value: T }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map(option => (
                <Button
                    key={option.value}
                    size="sm"
                    variant={value === option.value ? 'default' : 'outline'}
                    aria-pressed={value === option.value}
                    className="flex-1"
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}
