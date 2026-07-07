'use client';

// Ported from app/components/shared/AccountSizeField.tsx (pre-storybook).
// Tailwind `e-` prefix stripped; RawDataField points at the local copy.
import React from 'react';
import { Code } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
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
};

/**
 * Compact "size in bytes" control: shows the byte count and, when there's data,
 * opens the full RawDataField (hex/base64/copy/download) in a popover.
 */
export function AccountSizeField({ size, data, filename, loading, buttonClassName }: AccountSizeFieldProps) {
    if (loading) {
        return <span className="text-muted">Loading...</span>;
    }

    if (size === undefined) {
        return <span className="text-muted ml-7">-</span>;
    }

    if (size > 0) {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className={cn(buttonClassName)}>
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

    return <span className="ml-7">{size.toLocaleString('en-US')}</span>;
}
