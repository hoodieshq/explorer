'use client';

// Ported from app/features/transaction-history/ui/TransactionDetailsDrawer.tsx (pre-storybook).
// Tailwind `e-` prefix stripped; the Bootstrap `badge bg-*-soft` status pill swapped for the
// design-system <Badge ui="dashkit">; RawDataField/InstructionList point at the local copies.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle, Copy, X } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/app/components/shared/ui/dialog';
import { FetchStatus } from '@/app/providers/cache';
import { useFetchRawTransaction, useRawTransactionDetails } from '@/app/providers/transactions/raw';
import { RelativeTime } from '@/app/shared/RelativeTime';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';
import { displayTimestampUtc } from '@/app/utils/date';
import { TransactionInstructionInfo } from '@/app/utils/instruction';
import { useClusterPath } from '@/app/utils/url';

import { InstructionList, InstructionListSkeleton } from './InstructionList';
import { RawDataField } from './RawDataField';

/**
 * Mobile-only bottom-sheet drawer for the Transaction History `combined`
 * variant. Replaces the per-row copy/download icon buttons (hidden on mobile
 * in this variant) with a tap-to-open detail view that surfaces the same
 * data plus the primary actions (copy id / open / close).
 */
export function TransactionDetailsDrawer({
    open,
    onOpenChange,
    signature,
    slot,
    blockTime,
    statusClass,
    statusText,
    instructionNames,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    signature: string;
    slot: number;
    blockTime: number | null | undefined;
    statusClass: string;
    statusText: string;
    instructionNames: TransactionInstructionInfo[] | null;
}) {
    const txPath = useClusterPath({ pathname: `/tx/${signature}` });
    const blockPath = useClusterPath({ pathname: `/block/${slot}` });
    const [copyState, copy] = useCopyToClipboard();
    const [blockCopyState, copyBlock] = useCopyToClipboard();

    // Swipe-to-dismiss: drag the header down and release past a threshold to close.
    // Pointer (not touch) events so it works with mouse + touch alike; pointer
    // capture keeps move/up firing even once the pointer leaves the grab zone.
    const dragStartY = useRef<number | null>(null);
    const [dragY, setDragY] = useState(0);
    const [dragging, setDragging] = useState(false);
    const handleDragStart = (e: React.PointerEvent) => {
        dragStartY.current = e.clientY;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const handleDragMove = (e: React.PointerEvent) => {
        if (dragStartY.current === null) return;
        // Downward only — negative deltas (dragging up) are clamped to 0.
        setDragY(Math.max(0, e.clientY - dragStartY.current));
    };
    const handleDragEnd = (e: React.PointerEvent) => {
        if (dragStartY.current === null) return;
        if (dragY > 80) onOpenChange(false);
        dragStartY.current = null;
        setDragging(false);
        setDragY(0);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    };

    // Pull-to-close from the scroll region: only when the content is scrolled to
    // the very top. We arm on pointer-down at scrollTop 0, but don't take over
    // the gesture until we actually see downward movement — otherwise native
    // vertical scroll keeps working. An upward move (or any non-top scroll)
    // abandons the drag and hands the gesture back to the scroller.
    const scrollRef = useRef<HTMLDivElement | null>(null);

    // Edge fades: ramp in a gradient at whichever end has hidden content, so it
    // vanishes softly instead of at a hard edge. The top fade tracks scroll
    // distance from the top; the bottom fade tracks distance from the bottom, so
    // it shows while more content lies below and eases out on reaching the end.
    // Each ramps over the first/last 24px.
    const [topFade, setTopFade] = useState(0);
    const [bottomFade, setBottomFade] = useState(0);
    const updateFades = () => {
        const el = scrollRef.current;
        if (!el) return;
        setTopFade(Math.min(1, el.scrollTop / 24));
        const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setBottomFade(Math.min(1, fromBottom / 24));
    };

    const handleContentDragStart = (e: React.PointerEvent) => {
        if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
        dragStartY.current = e.clientY;
    };
    const handleContentDragMove = (e: React.PointerEvent) => {
        if (dragStartY.current === null) return;
        const delta = e.clientY - dragStartY.current;
        if (!dragging) {
            // Begin a sheet-drag only on downward movement while still at the top.
            if (delta > 0 && (scrollRef.current?.scrollTop ?? 0) <= 0) {
                setDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
            } else {
                // Upward, or the content has scrolled — let native scroll take over.
                dragStartY.current = null;
                return;
            }
        }
        setDragY(Math.max(0, delta));
    };

    // Raw-data lazy-fetch: when the drawer opens, kick off the request if we
    // don't already have the bytes cached.
    const fetchRaw = useFetchRawTransaction();
    const rawDetails = useRawTransactionDetails(signature);
    const serialized = rawDetails?.data?.raw?.message.serialize();
    const transactionData = useMemo(() => (serialized ? new Uint8Array(serialized) : undefined), [serialized]);
    const rawLoading = rawDetails?.status === FetchStatus.Fetching;
    useEffect(() => {
        if (open && !transactionData && !rawLoading) fetchRaw(signature);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Recompute edge fades whenever the drawer opens or its content height can
    // change (raw bytes / instruction list resolving) — onScroll alone never
    // fires for these, so the bottom fade would otherwise be stale.
    useEffect(() => {
        updateFades();
    }, [open, transactionData, instructionNames]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay />
                {/* Bottom drawer: override Dialog's centred placement. */}
                <DialogPrimitive.Content
                    // Don't auto-focus the first focusable element (the copy button) on open.
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="
                        tx-drawer
                        fixed z-50
                        left-0 right-0 top-auto bottom-0
                        flex max-h-[85vh] w-full max-w-none flex-col
                        rounded-t-2xl rounded-b-none
                        border-0 border-t border-solid border-dark-border
                        bg-heavy-metal-900
                    "
                    style={{
                        transform: `translateY(${dragY}px)`,
                        transition: dragging ? 'none' : 'transform 0.2s ease-out',
                    }}
                >
                    {/* Drag handle: pinned to the top of the drawer, never scrolls. The
                        entire 28px zone (pt-3 + 4px knob + pb-3) is the swipe-to-close grab
                        area, so the top of the drawer always closes on a downward drag even
                        after the content below has been scrolled. */}
                    <div
                        className="shrink-0 cursor-grab pt-3 pb-3"
                        style={{ touchAction: 'none' }}
                        onPointerDown={handleDragStart}
                        onPointerMove={handleDragMove}
                        onPointerUp={handleDragEnd}
                        onPointerCancel={handleDragEnd}
                    >
                        <div className="mx-auto h-1 w-9 rounded-full bg-outer-space-700" />
                    </div>

                    {/* Scrollable content region: everything from the "Transaction" label down to
                        (but not including) the button block. Caps the drawer at 85vh via the
                        Content's max-h; once the content is taller than the room left after the
                        pinned handle and fixed button block, this region scrolls. `min-h-0` lets
                        it shrink below its content height inside the flex column so
                        `overflow-y-auto` can engage. */}
                    {/* Relative wrapper so the top-fade overlay can be absolutely
                        positioned over the scroll region without disturbing the
                        drawer's own `fixed` placement. */}
                    <div className="relative flex min-h-0 flex-1 flex-col">
                    {/* Top fade overlay: sits at the top of the scroll region, pointer-through,
                        eases in as content scrolls up so it disappears under a soft gradient
                        instead of a hard edge. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6"
                        style={{
                            opacity: topFade,
                            transition: 'opacity 0.15s ease-out',
                            background:
                                'linear-gradient(to bottom, oklch(21.275% 0.00721 164.22), transparent)',
                        }}
                    />

                    {/* Bottom fade overlay: mirror of the top one, sits above the button
                        block and eases out as the content reaches the end. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6"
                        style={{
                            opacity: bottomFade,
                            transition: 'opacity 0.15s ease-out',
                            background:
                                'linear-gradient(to top, oklch(21.275% 0.00721 164.22), transparent)',
                        }}
                    />

                    <div
                        ref={scrollRef}
                        className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
                        style={{ overscrollBehavior: 'contain' }}
                        onScroll={updateFades}
                        onPointerDown={handleContentDragStart}
                        onPointerMove={handleContentDragMove}
                        onPointerUp={handleDragEnd}
                        onPointerCancel={handleDragEnd}
                    >
                        <DialogTitle className="!mt-0 text-base !text-outer-space-300">Transaction</DialogTitle>

                        {/* Big signature; the status badge drops to its own line below, with a
                            copy button pinned to the end of that line and aligned to the bottom. */}
                        <div className="mt-2 flex items-end gap-4 pb-2 text-white">
                            <div className="min-w-0 flex-1">
                                <span className="break-all font-mono text-xl">{signature}</span>
                                <div className="mt-1">
                                    <Badge ui="dashkit" tone="soft" variant={statusClass as 'success' | 'warning'}>
                                        {statusText}
                                    </Badge>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="my-[-4px] border-outer-space-800"
                                aria-label={copyState === 'copied' ? 'Copied signature' : 'Copy signature'}
                                onClick={() => copy(signature)}
                            >
                                {copyState === 'copied' ? (
                                    <CheckCircle size={12} className="text-dk-info" />
                                ) : (
                                    <Copy size={12} />
                                )}
                            </Button>
                        </div>

                    <hr className="mt-0 mb-0 border-0 border-t border-solid border-dark-border" />

                    {/* Property table — each row carries a top border. */}
                    <div className="flex flex-col text-sm">
                        {blockTime && (
                            <DrawerRow label="Time" alignTop>
                                <div className="flex flex-col">
                                    <span className="text-white">{displayTimestampUtc(blockTime * 1000, true)}</span>
                                    {/* Relative age (e.g. "about 2 years ago") under the absolute UTC time. */}
                                    <span className="text-white">
                                        <RelativeTime date={blockTime * 1000} />
                                    </span>
                                </div>
                            </DrawerRow>
                        )}
                        <DrawerRow
                            label="Block"
                            trailing={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="relative top-[1px] my-[-4px] border-outer-space-800"
                                    aria-label={blockCopyState === 'copied' ? 'Copied block number' : 'Copy block number'}
                                    onClick={() => copyBlock(slot.toString())}
                                >
                                    {blockCopyState === 'copied' ? (
                                        <CheckCircle size={12} className="text-dk-info" />
                                    ) : (
                                        <Copy size={12} />
                                    )}
                                </Button>
                            }
                        >
                            <Link href={blockPath} className="font-mono text-sm">
                                {slot.toLocaleString('en-US')}
                            </Link>
                        </DrawerRow>
                        <DrawerRow label="Programs">
                            <div className="tx-instr-inline">
                                {instructionNames !== null && instructionNames.length > 0 ? (
                                    <InstructionList instructions={instructionNames} />
                                ) : instructionNames === null ? (
                                    <InstructionListSkeleton />
                                ) : (
                                    <span className="text-muted">---</span>
                                )}
                            </div>
                        </DrawerRow>
                        {/* No separate "Size (bytes)" label — the raw-data field carries its own
                            "Size" caption before the byte count. Full-width stacked row. */}
                        <div className="flex flex-col gap-2 pt-2 pb-1 border-0 border-b border-solid border-dark-border">
                            <div className="min-w-0 text-white">
                                <RawDataField
                                    data={transactionData}
                                    loading={rawDetails === undefined || rawLoading}
                                    filename={signature}
                                    variant="embedded"
                                    bytesPrefix="Size "
                                />
                            </div>
                        </div>
                    </div>
                    </div>
                    </div>

                    {/* Primary action buttons — pinned below the scroll region, never scroll. */}
                    <div className="grid shrink-0 grid-cols-3 gap-2 px-4 pt-5 pb-4">
                        <ActionTile
                            icon={
                                copyState === 'copied' ? (
                                    <CheckCircle size={18} className="text-dk-info" />
                                ) : (
                                    <Copy size={18} />
                                )
                            }
                            label={copyState === 'copied' ? 'Copied' : 'Copy'}
                            copied={copyState === 'copied'}
                            onClick={() => copy(signature)}
                        />
                        <ActionTile icon={<ArrowRight size={18} />} label="Open" href={txPath} primary />
                        <ActionTile icon={<X size={18} />} label="Close" onClick={() => onOpenChange(false)} />
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

function DrawerRow({
    label,
    alignTop,
    trailing,
    children,
}: {
    label: string;
    alignTop?: boolean;
    trailing?: React.ReactNode;
    children?: React.ReactNode;
}) {
    return (
        <div
            className={`
                flex gap-4 py-2
                border-0 border-b border-solid border-dark-border
                ${alignTop ? 'items-start' : 'items-baseline'}
            `}
        >
            <span className="min-w-[5rem] text-outer-space-300">{label}</span>
            <span className="min-w-0 flex-1 text-white">{children}</span>
            {trailing}
        </div>
    );
}

function ActionTile({
    icon,
    label,
    onClick,
    href,
    primary,
    copied,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    href?: string;
    primary?: boolean;
    copied?: boolean;
}) {
    const cls = `
        flex flex-col items-center justify-center gap-1
        rounded-md border border-solid
        px-2 py-3 text-sm
        no-underline transition-colors
        ${
            primary
                ? 'border-transparent bg-emerald-400 text-heavy-metal-900 hover:bg-emerald-300'
                : 'border-outer-space-700 bg-transparent text-outer-space-200 hover:bg-outer-space-800'
        }
        ${copied ? 'tx-copy-flash' : ''}
    `;
    const labelEl = <span>{label}</span>;
    if (href) {
        return (
            <Link href={href} className={cls}>
                {icon}
                {labelEl}
            </Link>
        );
    }
    return (
        <button type="button" className={cls} onClick={onClick}>
            {icon}
            {labelEl}
        </button>
    );
}
