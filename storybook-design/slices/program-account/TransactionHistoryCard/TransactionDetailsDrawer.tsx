'use client';

// Ported from app/features/transaction-history/ui/TransactionDetailsDrawer.tsx (pre-storybook).
// Tailwind `e-` prefix stripped; the Bootstrap `badge bg-*-soft` status pill swapped for the
// design-system <Badge ui="dashkit">; RawDataField/InstructionList point at the local copies.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Link from 'next/link';
import React, { useEffect, useMemo } from 'react';
import { ArrowRight, Copy, Tag, X } from 'react-feather';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/app/components/shared/ui/dialog';
import { FetchStatus } from '@/app/providers/cache';
import { useFetchRawTransaction, useRawTransactionDetails } from '@/app/providers/transactions/raw';
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay />
                {/* Bottom drawer: override Dialog's centred placement. */}
                <DialogPrimitive.Content
                    className="
                        fixed z-50
                        left-0 right-0 top-auto bottom-0
                        w-full max-w-none
                        rounded-t-2xl rounded-b-none
                        border-0 border-t border-solid border-outer-space-800
                        bg-heavy-metal-900 p-4
                    "
                >
                    <DialogTitle className="!mt-[2px] text-dk-base !text-outer-space-300">Transaction</DialogTitle>

                    {/* Big signature with the status badge inlined directly after it. */}
                    <div className="mt-2 text-white">
                        <span className="break-all font-mono text-dk-h2">{signature}</span>{' '}
                        <Badge ui="dashkit" tone="soft" variant={statusClass as 'success' | 'warning'}>
                            {statusText}
                        </Badge>
                    </div>

                    <hr className="mt-3 mb-0 border-0 border-t border-solid border-outer-space-800" />

                    {/* Property table — each row carries a top border. */}
                    <div className="flex flex-col text-dk-sm">
                        {blockTime && (
                            <DrawerRow label="Time">
                                <span className="text-white">{displayTimestampUtc(blockTime * 1000, true)}</span>
                            </DrawerRow>
                        )}
                        <DrawerRow
                            label="Block"
                            trailing={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="my-[-4px]"
                                    aria-label={blockCopyState === 'copied' ? 'Copied block number' : 'Copy block number'}
                                    onClick={() => copyBlock(slot.toString())}
                                >
                                    <Copy size={12} />
                                </Button>
                            }
                        >
                            <Link href={blockPath} className="font-mono">
                                {slot.toLocaleString('en-US')}
                            </Link>
                        </DrawerRow>
                        <DrawerRow
                            label="Programs"
                            alignTop
                            trailing={
                                <Button variant="outline" size="sm" aria-label="Lookup names" onClick={() => {}}>
                                    <Tag size={12} />
                                </Button>
                            }
                        >
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
                        <DrawerRow label="Size (bytes)" alignTop>
                            <RawDataField
                                data={transactionData}
                                loading={rawDetails === undefined || rawLoading}
                                filename={signature}
                                variant="embedded"
                            />
                        </DrawerRow>
                    </div>

                    {/* Primary action buttons. */}
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        <ActionTile
                            icon={<Copy size={18} />}
                            label={copyState === 'copied' ? 'Copied!' : 'Copy tx ID'}
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
                border-0 border-b border-solid border-outer-space-800
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
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    href?: string;
    primary?: boolean;
}) {
    const cls = `
        flex flex-col items-center justify-center gap-1
        rounded-md border border-solid
        px-2 py-3 text-dk-xs
        no-underline transition-colors
        ${
            primary
                ? 'border-transparent bg-emerald-400 text-heavy-metal-900 hover:bg-emerald-300'
                : 'border-outer-space-700 bg-transparent text-outer-space-200 hover:bg-outer-space-800'
        }
    `;
    if (href) {
        return (
            <Link href={href} className={cls}>
                {icon}
                <span>{label}</span>
            </Link>
        );
    }
    return (
        <button type="button" className={cls} onClick={onClick}>
            {icon}
            <span>{label}</span>
        </button>
    );
}
