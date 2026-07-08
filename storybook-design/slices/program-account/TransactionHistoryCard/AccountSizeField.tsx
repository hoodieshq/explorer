'use client';

// Ported from app/components/shared/AccountSizeField.tsx (pre-storybook).
// Tailwind `e-` prefix stripped; RawDataField points at the local copy.
import React from 'react';
import { Code } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { cn } from '@/app/components/shared/utils';
import type { ByteArray } from '@/app/shared/lib/bytes';

import { RawDataField } from './RawDataField';

export type AccountSizeFieldProps = {
    /** Account data size in bytes. `undefined` renders a placeholder (account info unavailable). */
    size: number | undefined;
    /** Raw account data shown in the popover (only relevant when `size > 0`). */
    data: ByteArray | undefined;
    filename: string;
    loading?: boolean;
    /** Extra classes for the popover trigger button (e.g. to control vertical alignment in a table cell). */
    buttonClassName?: string;
    /**
     * Render the size as static text (`</>` glyph + byte count) instead of a
     * popover button. Used on mobile, where the whole row opens a drawer that
     * carries the raw-data view — so the cell must not be independently clickable.
     */
    readOnly?: boolean;
};

/**
 * Compact "size in bytes" control: shows the byte count and, when there's data,
 * opens the full RawDataField (hex/base64/copy/download) in a popover.
 */
export function AccountSizeField({ size, data, filename, loading, buttonClassName, readOnly }: AccountSizeFieldProps) {
    if (loading) {
        return <Skeleton className="tx-size-skeleton my-1 h-3.5 w-16" />;
    }

    if (size === undefined) {
        return <span className="text-outer-space-300">-</span>;
    }

    // Static, non-interactive rendering: keep the `</>` glyph and the byte count,
    // but drop the popover (the raw-data view lives in the mobile drawer).
    if (readOnly) {
        return (
            <span className="tx-size-readonly inline-flex items-center gap-1">
                <Code size={12} />
                <span>{size.toLocaleString('en-US')}</span>
            </span>
        );
    }

    if (size > 0) {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    {/* `!px-0` drops the ghost button's default horizontal padding so its
                        content lines up with the "Size (bytes)" header's left edge. */}
                    <Button variant="ghost" className={cn('!px-0', buttonClassName)}>
                        <Code size={12} />
                        <span>{size.toLocaleString('en-US')}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto !rounded-lg border-none p-0" align="end">
                    <RawDataField data={data} filename={filename} />
                </PopoverContent>
            </Popover>
        );
    }

    return <span>{size.toLocaleString('en-US')}</span>;
}
