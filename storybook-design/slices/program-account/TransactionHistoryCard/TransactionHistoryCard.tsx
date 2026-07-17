'use client';

// Rebuilt from the pre-storybook TransactionHistoryCard (the richer `combined`
// layout: inline status badge, timestamp tooltip, raw-data size popover, Programs
// column on desktop / programs-under-signature + tap-to-open drawer on mobile).
//
// Ported forward to this repo's Tailwind + design-system stack: the Bootstrap
// `.card`/`.table`/`.badge` shell is now <Card>/<BaseTable>/<Badge ui="dashkit">,
// the `e-` Tailwind prefix is dropped, and the mobile stacked-card transformation
// lives in the scoped ./transaction-history.css (all selectors under
// `.transaction-history-card`, so nothing leaks into other slices).
import './transaction-history.css';

import { PublicKey } from '@solana/web3.js';
import React, { useEffect, useMemo, useState } from 'react';

import { getTransactionRows } from '@/app/components/account/HistoryCardComponents';
import { ErrorCard } from '@/app/components/common/ErrorCard';
import { LoadingCard } from '@/app/components/common/LoadingCard';
import { Signature } from '@/app/components/common/Signature';
import { Slot } from '@/app/components/common/Slot';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { useResolvedInstructionSummaries } from '@/app/features/transaction-history/model/use-resolved-instruction-summaries';
import { useAccountHistory, useFetchAccountHistory } from '@/app/providers/accounts/history';
import { FetchStatus } from '@/app/providers/cache';
import { useFetchRawTransaction, useRawTransactionDetails } from '@/app/providers/transactions/raw';
import { useVisibility } from '@/app/shared/lib/visibility';
import { RelativeTime } from '@/app/shared/RelativeTime';
import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';
import { displayTimestampUtc } from '@/app/utils/date';

import { AccountSizeField } from './AccountSizeField';
import { InstructionList, InstructionListSkeleton } from './InstructionList';
import { TransactionDetailsDrawer } from './TransactionDetailsDrawer';

// Tracks whether the viewport matches `(max-width: 767.98px)`. Gates the mobile-only
// TransactionDetailsDrawer so desktop row clicks don't pop the drawer open.
function useIsMobileViewport(): boolean {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(max-width: 767.98px)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);
    return isMobile;
}

export function TransactionHistoryCard({ address }: { address: string }) {
    const pubkey = useMemo(() => new PublicKey(address), [address]);
    const history = useAccountHistory(address);
    const fetchAccountHistory = useFetchAccountHistory();
    const refresh = () => fetchAccountHistory(pubkey, false, true);
    const loadMore = () => fetchAccountHistory(pubkey, false);

    const transactionRows = React.useMemo(() => {
        if (history?.data?.fetched) {
            return getTransactionRows(history.data.fetched);
        }
        return [];
    }, [history]);

    React.useEffect(() => {
        if (!history) {
            refresh();
        }
    }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!history) {
        return undefined;
    }

    if (history?.data === undefined) {
        if (history.status === FetchStatus.Fetching) {
            return <LoadingCard message="Loading history" />;
        }

        return <ErrorCard retry={refresh} text="Failed to fetch transaction history" />;
    }

    const hasTimestamps = transactionRows.some(element => element.blockTime);
    // No rows → an empty account whose history is fully fetched. Hide the header
    // (nothing to label) and give the footer message room to breathe.
    const isEmpty = transactionRows.length === 0;
    const detailsList: React.ReactNode[] = transactionRows.map(
        ({ slot, signature, blockTime, statusClass, statusText }) => (
            <TransactionRow
                key={signature}
                signature={signature}
                slot={slot}
                blockTime={blockTime}
                statusClass={statusClass}
                statusText={statusText}
                hasTimestamps={hasTimestamps}
            />
        ),
    );

    const fetching = history.status === FetchStatus.Fetching;
    return (
        <div className="transaction-history-card">
            <div className="thc-external-header">
                <h3 className="thc-title text-dk-h3">Transaction History</h3>
            </div>
            <Card ui="dashkit" marginBottom="none" className="thc-card">
                <BaseTable ui="dashkit" variant="card" nowrap>
                    {!isEmpty && (
                        <BaseTable.Head>
                            <BaseTable.Row>
                                <BaseTable.HeaderCell>Transaction Signature</BaseTable.HeaderCell>
                                {hasTimestamps && (
                                    <BaseTable.HeaderCell className="w-[26%] min-w-[190px]" data-md-header="time">
                                        Time
                                    </BaseTable.HeaderCell>
                                )}
                                <BaseTable.HeaderCell className="w-[19%] min-w-[150px]">Block</BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="w-[16%] min-w-[120px]">
                                    Size (bytes)
                                </BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="thc-progs-col">Programs</BaseTable.HeaderCell>
                            </BaseTable.Row>
                        </BaseTable.Head>
                    )}
                    <BaseTable.Body>{detailsList}</BaseTable.Body>
                </BaseTable>
                <div className={`thc-footer${isEmpty ? 'thc-footer--empty' : ''}`}>
                    {history.data.foundOldest ? (
                        <div className="text-center text-dk-gray-700">Fetched full history</div>
                    ) : (
                        <Button
                            ui="dashkit"
                            variant="primary"
                            className="w-full"
                            onClick={() => loadMore()}
                            disabled={fetching}
                        >
                            {fetching ? 'Loading' : 'Load More'}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}

type TransactionRowProps = {
    signature: string;
    slot: number;
    blockTime: number | null | undefined;
    statusClass: string;
    statusText: string;
    hasTimestamps: boolean;
};

function TransactionRow({ signature, slot, blockTime, statusClass, statusText, hasTimestamps }: TransactionRowProps) {
    const { isVisible, ref } = useVisibility<HTMLTableRowElement>(true);
    // Per-instruction summaries (program + resolved instruction name) for this signature; the fetch is
    // gated on row visibility. Returns undefined while loading, [] once fetched with nothing to show.
    const instructionNames = useResolvedInstructionSummaries(signature, isVisible);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const isMobile = useIsMobileViewport();

    const programsBlock =
        instructionNames !== undefined && instructionNames.length > 0 ? (
            <InstructionList instructions={instructionNames} />
        ) : instructionNames === undefined ? (
            <InstructionListSkeleton />
        ) : (
            <span className="text-outer-space-300">---</span>
        );

    const handleRowClick = (e: React.MouseEvent) => {
        // Skip the drawer when the user actually clicked a real link/button in the row.
        if (e.target instanceof HTMLElement && e.target.closest('a, button')) return;
        if (isMobile) setDrawerOpen(true);
    };

    return (
        <>
            <BaseTable.Row ref={ref} className="tx-data-row" onClick={isMobile ? handleRowClick : undefined}>
                <BaseTable.Cell data-label="Signature">
                    <div className="tx-sig-cell">
                        <div className="flex min-w-0 items-start gap-2">
                            {/* The signature is always a real link: tapping it navigates (the
                                row's click handler skips the drawer for taps on `a`/`button`),
                                while tapping elsewhere on the card opens the drawer. The per-row
                                copy icon stays hidden on mobile via CSS. */}
                            <span className="tx-sig-value min-w-0">
                                <Signature signature={signature} link />
                            </span>
                            <Badge
                                ui="dashkit"
                                tone="soft"
                                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- statusClass is a Bootstrap-derived 'success'|'warning' value widened to string by getTransactionRows
                                variant={statusClass as 'success' | 'warning'}
                                className="tx-status-badge"
                            >
                                {statusText}
                            </Badge>
                        </div>
                        {/* Programs stacked under the signature below lg; at lg+ they render as the
                            trailing Programs column instead. Visibility is driven from CSS (same 992
                            boundary as .thc-progs-col) — NOT Tailwind `lg:` (993 here), which would
                            desync from the column and show programs in both places at 992. */}
                        <div className="tx-instr-under-sig">{programsBlock}</div>
                    </div>
                </BaseTable.Cell>

                {hasTimestamps && (
                    <BaseTable.Cell className="w-px text-outer-space-300" data-label="Time">
                        {blockTime ? (
                            // Two-line stack (mirrors the drawer's Time row): absolute UTC
                            // timestamp on top, relative age beneath. On mobile the relative
                            // line is hidden (see .tx-time-rel in transaction-history.css) so
                            // only the timestamp shows.
                            <div className="tx-time-cell flex flex-col">
                                <span className="tx-time-abs text-sm">
                                    {displayTimestampUtc(blockTime * 1000, true)}
                                </span>
                                <span className="tx-time-rel text-sm">
                                    <RelativeTime date={blockTime * 1000} />
                                </span>
                            </div>
                        ) : (
                            '---'
                        )}
                    </BaseTable.Cell>
                )}

                <BaseTable.Cell className="w-px" data-label="Block">
                    {/* Block link is dropped on mobile — Slot renders plain text (no copy, no link). */}
                    <Slot slot={slot} link={!isMobile} />
                </BaseTable.Cell>

                {/* Size (bytes) is hidden on mobile — the drawer carries its own size row
                    plus the raw-data view. */}
                {!isMobile && (
                    <BaseTable.Cell className="tx-raw-data-cell w-px" data-label="Size (bytes)">
                        <TransactionRawDataSize signature={signature} />
                    </BaseTable.Cell>
                )}

                {/* Programs as its own trailing column on desktop (lg+). */}
                <BaseTable.Cell className="thc-progs-col" data-label="Programs">
                    <div className="tx-instr-inline">{programsBlock}</div>
                </BaseTable.Cell>
            </BaseTable.Row>

            {isMobile && (
                <TransactionDetailsDrawer
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    signature={signature}
                    slot={slot}
                    blockTime={blockTime}
                    statusClass={statusClass}
                    statusText={statusText}
                    instructionNames={instructionNames}
                />
            )}
        </>
    );
}

// Raw-data column: byte-size button that opens the raw data (hex/base64 + copy +
// download) in a popover. Fetches on mount so the size is shown without interaction.
function TransactionRawDataSize({ signature }: { signature: string }) {
    const fetchRaw = useFetchRawTransaction();
    const rawDetails = useRawTransactionDetails(signature);
    const serialized = rawDetails?.data?.raw?.message.serialize();
    const transactionData = useMemo(() => (serialized ? new Uint8Array(serialized) : undefined), [serialized]);
    const loading = rawDetails === undefined || rawDetails.status === FetchStatus.Fetching;

    useEffect(() => {
        if (!transactionData && rawDetails === undefined) fetchRaw(signature);
    }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AccountSizeField
            size={transactionData?.length}
            data={transactionData}
            filename={signature}
            loading={loading}
            // Collapse the button's fixed height so the size sits on the same line
            // as the other top-aligned cells.
            buttonClassName="!h-auto !py-0"
        />
    );
}
