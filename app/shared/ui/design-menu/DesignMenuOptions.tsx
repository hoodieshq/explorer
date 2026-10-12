'use client';

import { Button } from '@components/shared/ui/button';
import { cva } from 'class-variance-authority';

// REVIEW(design-menu): part of the review-only design menu; remove with it.

/**
 * One pick among a few variants, as buttons; the picked one has the pressed look of the cards' Raw toggle. A row fits
 * up to three or four short labels in the menu's width; `grid` lays more out three to a line.
 */
export function DesignMenuOptions<T extends string>({
    layout = 'row',
    options,
    value,
    onChange,
}: {
    layout?: 'row' | 'grid';
    options: readonly { label: string; value: T }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className={optionsVariants({ layout })}>
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

const optionsVariants = cva('gap-2', { variants: { layout: { grid: 'grid grid-cols-3', row: 'flex' } } });
