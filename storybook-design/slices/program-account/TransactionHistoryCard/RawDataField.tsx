'use client';

// Ported from app/components/shared/RawDataField.tsx (pre-storybook). Keeps the
// `embedded` variant the drawer needs. Tailwind `e-` prefix stripped for this
// repo's non-prefixed config; imports rewritten to @/app; the Bootstrap
// `spinner-grow` loading marker swapped for a Tailwind spinner.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Copy, Maximize2, X } from 'react-feather';

import { HexData } from '@/app/components/shared/HexData';
import { Button } from '@/app/components/shared/ui/button';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/app/components/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { cn } from '@/app/components/shared/utils';
import { DownloadDropdown } from '@/app/shared/components/DownloadDropdown';
import { type ByteArray, toBase64, toHex } from '@/app/shared/lib/bytes';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';

// Must match HexData's default spanSize (4 bytes). 6 spans × 4 bytes = 24 bytes per row.
const HEX_ROW_BYTES = 24;
const VISIBLE_ROWS = 3;

const BASE64_VISIBLE_CHARS = 192;

// Inline string conversion (hex/base64) is skipped above this threshold.
// Copy is disabled, use the download button for large payloads.
const MAX_INLINE_BYTES = 1024;

// Bottom fade-out overlay for the `embedded` variant: the data dissolves into
// the host background (heavy-metal-900) over its last 28px instead of being cut
// off by a divider. Inline gradient because this project skips `@tailwind base`,
// so Tailwind's gradient utilities don't resolve.
const FADE_TO_BG = 'linear-gradient(to bottom, oklch(21.275% 0.00721 164.22 / 0) 0%, oklch(21.275% 0.00721 164.22) 100%)';

const Spinner = () => (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-outer-space-300 border-t-transparent" />
);

export type RawDataFieldProps = {
    data: ByteArray | undefined;
    loading?: boolean;
    filename: string;
    /**
     * Visual layout:
     *   `popover`  — self-contained card (border + bg + rounding + capped width).
     *   `embedded` — chromeless, full-width; byte count + Hex/Base64 tabs on top,
     *                copy/download + "Show more" (full-screen dialog) on the bottom.
     */
    variant?: 'popover' | 'embedded';
};

export function RawDataField({ data, loading, filename, variant = 'popover' }: RawDataFieldProps) {
    const [tab, setTab] = useState<'hex' | 'base64'>('hex');
    const [expanded, setExpanded] = useState(false);
    const [fullscreenOpen, setFullscreenOpen] = useState(false);
    const [copyState, copy] = useCopyToClipboard();

    useEffect(() => {
        setExpanded(false);
    }, [data]);

    const hasData = data !== undefined && data.length > 0;
    const tooLarge = data !== undefined && data.length > MAX_INLINE_BYTES;

    const hexString = useMemo(() => (data && data.length > 0 ? toHex(data) : ''), [data]);
    const base64String = useMemo(() => (data && data.length > 0 ? toBase64(new Uint8Array(data)) : ''), [data]);

    const hasMoreHex = data !== undefined && data.length > VISIBLE_ROWS * HEX_ROW_BYTES;
    const visibleData = !expanded && hasMoreHex ? data.subarray(0, VISIBLE_ROWS * HEX_ROW_BYTES) : data;

    const hasMoreBase64 = base64String.length > BASE64_VISIBLE_CHARS;
    const visibleBase64 = expanded ? base64String : base64String.slice(0, BASE64_VISIBLE_CHARS);

    const hasMore = (tab === 'hex' && hasMoreHex) || (tab === 'base64' && hasMoreBase64);

    const handleTabChange = (value: string) => {
        if (value === 'hex' || value === 'base64') {
            if (value !== tab) setExpanded(false);
            setTab(value);
        }
    };

    // ---- Embedded variant -------------------------------------------------
    if (variant === 'embedded') {
        const tabsList = (
            <TabsList>
                <TabsTrigger className="!py-0 text-dk-sm" value="hex">
                    Hex
                </TabsTrigger>
                <TabsTrigger className="!py-0 text-dk-sm" value="base64">
                    Base64
                </TabsTrigger>
            </TabsList>
        );

        const byteCount = (
            <span className="whitespace-nowrap text-dk-sm text-outer-space-300">
                {data !== undefined && !loading ? `${data.length} bytes` : null}
            </span>
        );

        const copyButton = (
            <Button
                variant="outline"
                size="sm"
                aria-label="Copy"
                disabled={!hasData || loading}
                onClick={() => copy(tab === 'base64' ? base64String : hexString)}
            >
                <Copy size={12} />
                <span className="hidden md:inline">{copyState === 'copied' ? 'Copied!' : 'Copy'}</span>
            </Button>
        );

        const downloadButton = (
            <DownloadDropdown filename={filename} data={data} loading={loading} disabled={!hasData} encodings={[tab]} />
        );

        const renderPanes = (full: boolean, paneClassName: string) => (
            <>
                <TabsContent value="hex" className={cn('overflow-y-auto text-start', paneClassName)}>
                    {loading ? (
                        <Spinner />
                    ) : tooLarge ? (
                        <span className="text-dk-sm text-outer-space-200">Too large to display - use download/copy.</span>
                    ) : (
                        <HexData
                            className="w-full"
                            raw={(full ? data : visibleData) ?? new Uint8Array(0)}
                            isCopyable={false}
                            rowSize={HEX_ROW_BYTES}
                            align="start"
                        />
                    )}
                </TabsContent>
                <TabsContent value="base64" className={cn('overflow-y-auto text-start', paneClassName)}>
                    {loading ? (
                        <Spinner />
                    ) : !hasData ? (
                        <span className="text-dk-sm text-outer-space-200">No data</span>
                    ) : tooLarge ? (
                        <span className="text-dk-sm text-outer-space-200">Too large to display - use download/copy.</span>
                    ) : (
                        <span className="text-wrap break-all font-mono text-dk-xs text-white">
                            {full ? base64String : visibleBase64}
                            {!full && hasMoreBase64 && '…'}
                        </span>
                    )}
                </TabsContent>
            </>
        );

        return (
            <>
                <Tabs value={tab} onValueChange={handleTabChange} className="w-full overflow-hidden">
                    <div className="flex items-center justify-between gap-4">
                        {byteCount}
                        {tabsList}
                    </div>

                    <div className="relative">
                        {renderPanes(false, 'py-0.5')}
                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                            style={{ backgroundImage: FADE_TO_BG }}
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        {hasData && !loading && !tooLarge ? (
                            <Button variant="outline" size="sm" onClick={() => setFullscreenOpen(true)}>
                                <span className="text-dk-xs text-outer-space-300">Show more</span>
                                <Maximize2 size={14} />
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex items-center gap-2">
                            {copyButton}
                            {downloadButton}
                        </div>
                    </div>
                </Tabs>

                <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
                    <DialogPortal>
                        <DialogOverlay />
                        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-heavy-metal-900 p-4">
                            <DialogTitle className="sr-only">Raw transaction data</DialogTitle>
                            <Tabs
                                value={tab}
                                onValueChange={handleTabChange}
                                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    {byteCount}
                                    <div className="flex items-center gap-3">
                                        {tabsList}
                                        <DialogPrimitive.Close
                                            className="border-0 bg-transparent p-1 text-outer-space-300 hover:text-white"
                                            aria-label="Close"
                                        >
                                            <X size={18} />
                                        </DialogPrimitive.Close>
                                    </div>
                                </div>

                                <div className="relative flex min-h-0 flex-1 flex-col">
                                    {renderPanes(true, 'min-h-0 flex-1 py-2')}
                                    <div
                                        className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                                        style={{ backgroundImage: FADE_TO_BG }}
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    {copyButton}
                                    {downloadButton}
                                </div>
                            </Tabs>
                        </DialogPrimitive.Content>
                    </DialogPortal>
                </Dialog>
            </>
        );
    }

    // ---- Popover variant (default) ----------------------------------------
    return (
        <Tabs
            value={tab}
            onValueChange={handleTabChange}
            className="max-w-[100vw] overflow-hidden rounded-lg border border-solid border-outer-space-800 bg-heavy-metal-900 lg:max-w-[540px]"
        >
            <div className="flex flex-wrap justify-between gap-8 border-b border-outer-space-800 px-3 [border-bottom-style:solid]">
                <TabsList>
                    <TabsTrigger className="!py-2 text-dk-xs" value="hex">
                        Hex
                    </TabsTrigger>
                    <TabsTrigger className="!py-2 text-dk-xs" value="base64">
                        Base64
                    </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                    {data !== undefined && !loading && (
                        <span className="whitespace-nowrap text-dk-xs text-outer-space-300">{data.length} bytes</span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label="Copy"
                        disabled={!hasData || loading}
                        onClick={() => copy(tab === 'base64' ? base64String : hexString)}
                    >
                        <Copy size={12} />
                        <span className="hidden md:inline">{copyState === 'copied' ? 'Copied!' : 'Copy'}</span>
                    </Button>
                    <DownloadDropdown filename={filename} data={data} loading={loading} disabled={!hasData} encodings={[tab]} />
                </div>
            </div>

            <TabsContent
                value="hex"
                className={cn('max-h-80 overflow-y-auto p-1.5 text-start', loading && 'p-3', tooLarge && 'px-3 py-2')}
            >
                {loading ? (
                    <Spinner />
                ) : tooLarge ? (
                    <span className="text-dk-sm text-outer-space-200">Too large to display - use download/copy.</span>
                ) : (
                    <HexData
                        className="w-full"
                        raw={visibleData ?? new Uint8Array(0)}
                        isCopyable={false}
                        rowSize={HEX_ROW_BYTES}
                        align="start"
                    />
                )}
            </TabsContent>

            <TabsContent
                value="base64"
                className={cn('max-h-80 overflow-y-auto p-3 text-start', !loading && data?.length && 'py-2')}
            >
                {loading ? (
                    <Spinner />
                ) : !hasData ? (
                    <span className="text-dk-sm text-outer-space-200">No data</span>
                ) : tooLarge ? (
                    <span className="text-dk-sm text-outer-space-200">Too large to display - use download/copy.</span>
                ) : (
                    <span className="text-wrap break-all font-mono text-dk-xs text-white">
                        {visibleBase64}
                        {!expanded && hasMoreBase64 && '…'}
                    </span>
                )}
            </TabsContent>

            {hasMore && !tooLarge && !loading && hasData && (
                <div className="mt-1 flex justify-center border-t border-outer-space-800 [border-top-style:solid]">
                    <Button variant="ghost" className="hover:!bg-transparent" size="sm" onClick={() => setExpanded(e => !e)}>
                        <span className="text-dk-xs text-outer-space-300">{expanded ? 'Show less' : 'Show more'}</span>
                        <ChevronDown
                            size={14}
                            className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'}
                        />
                    </Button>
                </div>
            )}
        </Tabs>
    );
}
