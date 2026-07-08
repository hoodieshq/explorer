'use client';

// Ported from app/components/shared/RawDataField.tsx (pre-storybook). Keeps the
// `embedded` variant the drawer needs. Tailwind `e-` prefix stripped for this
// repo's non-prefixed config; imports rewritten to @/app; the Bootstrap
// `spinner-grow` loading marker swapped for a Tailwind spinner.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, ChevronDown, Copy, Download, Maximize2, Minimize2, X } from 'react-feather';

import { HexData } from '@/app/components/shared/HexData';
import { Button } from '@/app/components/shared/ui/button';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/app/components/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { cn, cnPrefixed } from '@/app/components/shared/utils';
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

// Encodings offered by the fullscreen "View" picker (the tabs, relocated into the
// bottom action bar). Extending this list is safe — extra options just scroll.
const VIEW_VARIANTS: { value: 'hex' | 'base64'; label: string }[] = [
    { value: 'hex', label: 'Hex' },
    { value: 'base64', label: 'Base64' },
];

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
    // Fullscreen only: whether the bottom bar shows the action tiles or the
    // relocated Hex/Base64 variant picker.
    const [viewPicker, setViewPicker] = useState(false);
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

    // Collapsed embedded view is clamped to 4 rows via CSS; measure whether the
    // (fully-rendered) data actually overflows that clamp so the fade + "Full screen"
    // spoiler only appear when there's more to reveal. Byte counts can't tell us this
    // once the hex wraps responsively — only the rendered height can.
    const dataRef = useRef<HTMLDivElement>(null);
    const [clamped, setClamped] = useState(false);
    useEffect(() => {
        const el = dataRef.current;
        if (!el) return;
        const measure = () => setClamped(el.scrollHeight - el.clientHeight > 1);
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [data, tab, loading, expanded]);

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
                <TabsTrigger className="!py-0 text-dk-sm flex-1" value="hex">
                    Hex
                </TabsTrigger>
                <TabsTrigger className="!py-0 text-dk-sm flex-1" value="base64">
                    Base64
                </TabsTrigger>
            </TabsList>
        );

        const byteCount = (
            <span className="whitespace-nowrap text-dk-base text-white">
                {data !== undefined && !loading ? `${data.length} bytes` : null}
            </span>
        );

        const copyButton = (
            <Button
                variant="outline"
                size="sm"
                aria-label={copyState === 'copied' ? 'Copied' : 'Copy'}
                disabled={!hasData || loading}
                onClick={() => copy(tab === 'base64' ? base64String : hexString)}
            >
                {copyState === 'copied' ? <CheckCircle size={12} className="text-dk-info" /> : <Copy size={12} />}
            </Button>
        );

        const downloadButton = (
            <DownloadDropdown filename={filename} data={data} loading={loading} disabled={!hasData} encodings={[tab]} />
        );

        // Fullscreen footer tiles: identical sizing to the drawer's bottom ActionTiles
        // (grid-cols-3 gap-2; flex-col, px-2 py-3, size-18 icon + text-dk-xs label).
        const tileCls = cn(
            'flex flex-col items-center justify-center gap-1 rounded-md border border-solid',
            'border-outer-space-700 bg-transparent px-2 py-3 text-center text-dk-xs text-outer-space-200',
            'no-underline transition-colors hover:bg-outer-space-800',
            'disabled:pointer-events-none disabled:opacity-50',
        );

        const pickerOptions = VIEW_VARIANTS.map(v => ({ key: v.value, label: v.label, value: v.value }));

        const renderPanes = (paneClassName: string) => (
            <>
                <TabsContent value="hex" className={cn('overflow-y-auto text-start', paneClassName)}>
                    {loading ? (
                        <Spinner />
                    ) : !hasData ? (
                        // Explicit empty state (flush-left) instead of HexData's own "No data",
                        // whose p-1.5 would indent the text past the byte-count label.
                        <span className="text-dk-sm text-outer-space-200">No data</span>
                    ) : tooLarge ? (
                        <span className="text-dk-sm text-outer-space-200">Too large to display - use download/copy.</span>
                    ) : (
                        <HexData
                            className="w-full"
                            raw={data ?? new Uint8Array(0)}
                            isCopyable={false}
                            rowSize={HEX_ROW_BYTES}
                            align="start"
                            wrap
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
                        <span className="text-wrap break-all font-mono text-xs text-white">{base64String}</span>
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

                    {/* Show at most 4 rows; the rest is revealed via the "Full screen" spoiler.
                        max-h-[5rem] = pane (0.25rem) + <pre> padding (0.75rem) + 4×1rem line-height. */}
                    <div ref={dataRef} className="relative max-h-[5rem] overflow-hidden">
                        {renderPanes('py-0.5')}
                        {clamped && (
                            <div
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                                style={{ backgroundImage: FADE_TO_BG }}
                            />
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        {hasData && !loading && !tooLarge && clamped ? (
                            <Button variant="outline" size="sm" onClick={() => setFullscreenOpen(true)}>
                                <span className="text-dk-xs text-outer-space-300">Full screen</span>
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

                <Dialog
                    open={fullscreenOpen}
                    onOpenChange={open => {
                        setFullscreenOpen(open);
                        if (!open) setViewPicker(false);
                    }}
                >
                    <DialogPortal>
                        <DialogOverlay />
                        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-heavy-metal-900 p-4">
                            <DialogTitle className="sr-only">Raw transaction data</DialogTitle>
                            <Tabs
                                value={tab}
                                onValueChange={handleTabChange}
                                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                            >
                                {/* Tabs are relocated to the bottom action bar in fullscreen. */}
                                <div className="flex items-center gap-4">{byteCount}</div>

                                <div className="relative flex min-h-0 flex-1 flex-col">
                                    {renderPanes('min-h-0 flex-1 py-2')}
                                    <div
                                        className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                                        style={{ backgroundImage: FADE_TO_BG }}
                                    />
                                </div>
                            </Tabs>

                            {/* Bottom action bar — a sibling of <Tabs> (not inside it) so the open-picker
                                variants can bleed past the dialog padding to the screen edges; the Tabs box
                                clips horizontal overflow. The buttons row is always rendered (hidden while
                                the picker is open) so it defines the bar height; the picker overlays it,
                                keeping both rows exactly the same height. */}
                            <div className="relative pt-2">
                                <div className={cn('grid grid-cols-4 gap-2', viewPicker && 'invisible')}>
                                    {/* Format picker: selected variant where the icon would be, "Format"
                                        label, green dropdown chevron pinned top-right. */}
                                    <button
                                        type="button"
                                        onClick={() => setViewPicker(true)}
                                        aria-label="Change format"
                                        className={cn(tileCls, 'relative')}
                                    >
                                        <ChevronDown size={12} className="absolute right-1 top-1 text-emerald-400" />
                                        <span className="text-dk-sm text-white">
                                            {VIEW_VARIANTS.find(v => v.value === tab)?.label}
                                        </span>
                                        <span className="text-dk-xs">Format</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={tileCls}
                                        disabled={!hasData || loading}
                                        aria-label={copyState === 'copied' ? 'Copied' : 'Copy'}
                                        onClick={() => copy(tab === 'base64' ? base64String : hexString)}
                                    >
                                        {copyState === 'copied' ? (
                                            <CheckCircle size={18} className="text-dk-info" />
                                        ) : (
                                            <Copy size={18} />
                                        )}
                                        <span>{copyState === 'copied' ? 'Copied' : 'Copy'}</span>
                                    </button>
                                    <DownloadDropdown
                                        filename={filename}
                                        data={data}
                                        loading={loading}
                                        disabled={!hasData}
                                        encodings={[tab]}
                                    >
                                        <button
                                            type="button"
                                            className={tileCls}
                                            disabled={!hasData || loading}
                                            aria-label="Download"
                                        >
                                            <Download size={18} />
                                            <span>Download</span>
                                        </button>
                                    </DownloadDropdown>
                                    <DialogPrimitive.Close asChild>
                                        <button type="button" className={tileCls} aria-label="Exit full screen">
                                            <Minimize2 size={18} />
                                            <span>Exit full screen</span>
                                        </button>
                                    </DialogPrimitive.Close>
                                </div>

                                {viewPicker && (
                                    <>
                                        {/* Variants scroll full-bleed to the screen edges (-left/right-4 cancel
                                            the dialog padding): they slide under the backing on the left and off
                                            the screen on the right, never clipping in mid-air. */}
                                        <div className="absolute -left-4 -right-4 top-2 bottom-0 flex items-stretch gap-2 overflow-x-auto pl-[calc(20vw+1.5rem)]">
                                            {pickerOptions.map(o => (
                                                <button
                                                    key={o.key}
                                                    type="button"
                                                    onClick={() => {
                                                        handleTabChange(o.value);
                                                        setViewPicker(false);
                                                    }}
                                                    className={cnPrefixed(
                                                        tileCls,
                                                        'flex-none px-5',
                                                        tab === o.value && 'border-emerald-400 text-white',
                                                    )}
                                                >
                                                    <span className="text-dk-sm">{o.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {/* Opaque backing (подложка) from the screen edge to the Format tile's
                                            right edge; variants disappear under it (no peek-through past the
                                            tile's rounded corners), and it reads as the active/exit control. */}
                                        <div className="absolute -left-4 top-2 bottom-0 z-10 flex w-[calc(20vw+1rem)] items-stretch bg-heavy-metal-900 pl-4">
                                            <button
                                                type="button"
                                                onClick={() => setViewPicker(false)}
                                                aria-label="Close format picker"
                                                className={cnPrefixed(
                                                    tileCls,
                                                    'relative w-full flex-none',
                                                    'border-emerald-400 bg-outer-space-800 text-white',
                                                )}
                                            >
                                                <X size={12} className="absolute right-1 top-1 text-emerald-400" />
                                                <span className="text-dk-sm">
                                                    {VIEW_VARIANTS.find(v => v.value === tab)?.label}
                                                </span>
                                                <span className="text-dk-xs">Format</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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
