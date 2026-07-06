import React from 'react';

import { cn } from '@/app/components/shared/utils';

import { Icon } from './Icon';
import { Label } from './Label';
import type { LabelSize, LineBox } from './tokens';

/**
 * One key-value row: label on the left, value on the right. Stacks on mobile; from `sm`
 * up it's a flex row with `items-baseline` so the value's baseline lines up with the
 * label's — and the label's own line-box shim (see Label) standardizes the row's text height.
 *
 * `label` is wrapped in a `Label` so every key gets the same typography + baseline box,
 * including component labels (links/tooltips), which inherit the size and add their own color.
 * An optional `icon` is wrapped in `Icon` (the Label counterpart) and placed before the label;
 * because both share `labelSize`/`lineBox` they land on the same grid with no per-row nudging.
 *
 * The label column width is a prop (`labelWidth`, a Tailwind width class) so a set of rows can
 * share one width and keep their values aligned — pass the same class to each row (the default
 * `sm:w-56` already gives every row an equal-length label column).
 */
export function KeyValue({
    label,
    icon,
    labelSize = 'm',
    lineBox = 24,
    labelWidth = 'sm:w-56',
    align = 'start',
    className,
    valueClassName,
    children,
}: {
    label: React.ReactNode;
    icon?: React.ReactNode;
    labelSize?: LabelSize;
    lineBox?: LineBox;
    /** Tailwind width class(es) for the label column; keep it the same across rows for equal-length labels. */
    labelWidth?: string;
    /** Horizontal alignment of the value column from `sm` up. Defaults to `start` (left). */
    align?: 'start' | 'end';
    className?: string;
    /** Extra classes for the value column (e.g. custom flex/gap for composite values). */
    valueClassName?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-1 border-0 border-b border-solid border-dark-border px-dk-4 py-3 last:border-b-0',
                'sm:flex-row sm:items-baseline sm:gap-dk-4',
                className,
            )}
        >
            {/* items-start: Icon and Label are both `lineBox`-tall boxes that internally drop their
                content onto the shared grid, so aligning their tops aligns their contents. */}
            <div className={cn('flex items-start gap-1.5 sm:flex-none', labelWidth)}>
                {icon != null && (
                    <Icon size={labelSize} lineBox={lineBox}>
                        {icon}
                    </Icon>
                )}
                <Label size={labelSize} lineBox={lineBox}>
                    {label}
                </Label>
            </div>
            <div
                className={cn(
                    'flex min-w-0 flex-1 break-words text-dk-base',
                    align === 'end' && 'sm:justify-end',
                    valueClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
}
