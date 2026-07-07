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
import { PublicKey } from '@solana/web3.js';
import React, { useEffect, useMemo, useState } from 'react';
import { Info } from 'react-feather';

import { getTransactionRows } from '@/app/components/account/HistoryCardComponents';
import { ErrorCard } from '@/app/components/common/ErrorCard';
import { LoadingCard } from '@/app/components/common/LoadingCard';
import { Signature } from '@/app/components/common/Signature';
import { Slot } from '@/app/components/common/Slot';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/shared/ui/tooltip';
import { useAccountHistory, useFetchAccountHistory } from '@/app/providers/accounts/history';
import { FetchStatus } from '@/app/providers/cache';
import { useFetchRawTransaction, useRawTransactionDetails } from '@/app/providers/transactions/raw';
import { useVisibility } from '@/app/shared/lib/visibility';
import { RelativeTime } from '@/app/shared/RelativeTime';
import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';
import { displayTimestampUtc } from '@/app/utils/date';

import { useInstructionNames } from '@/app/features/transaction-history/lib/use-instruction-names';

import { AccountSizeField } from './AccountSizeField';
import { InstructionList, InstructionListSkeleton } from './InstructionList';
import { TransactionDetailsDrawer } from './TransactionDetailsDrawer';
import './transaction-history.css';

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
        return null;
    }

    if (history?.data === undefined) {
        if (history.status === FetchStatus.Fetching) {
            return <LoadingCard message="Loading history" />;
        }

        return <ErrorCard retry={refresh} text="Failed to fetch transaction history" />;
    }

    const hasTimestamps = transactionRows.some(element => element.blockTime);
    const detailsList: React.ReactNode[] = transactionRows.map(({ slot, signature, blockTime, statusClass, statusText }) => (
        <TransactionRow
            key={signature}
            signature={signature}
            slot={slot}
            blockTime={blockTime}
            statusClass={statusClass}
            statusText={statusText}
            hasTimestamps={hasTimestamps}
        />
    ));

    const fetching = history.status === FetchStatus.Fetching;
    return (
        <div className="transaction-history-card">
            <div className="thc-external-header">
                <h3 className="thc-title text-dk-h3">Transaction History</h3>
            </div>
            <Card ui="dashkit" marginBottom="none">
                <BaseTable ui="dashkit" variant="card" nowrap>
                    <BaseTable.Head>
                        <BaseTable.Row>
                            <BaseTable.HeaderCell>Transaction Signature</BaseTable.HeaderCell>
                            {hasTimestamps && (
                                <BaseTable.HeaderCell className="w-px" data-md-header="time">
                                    Timestamp
                                </BaseTable.HeaderCell>
                            )}
                            <BaseTable.HeaderCell className="w-px">Block</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="w-px">Size (bytes)</BaseTable.HeaderCell>
                            <BaseTable.HeaderCell className="thc-progs-col">Programs</BaseTable.HeaderCell>
                        </BaseTable.Row>
                    </BaseTable.Head>
                    <BaseTable.Body>{detailsList}</BaseTable.Body>
                </BaseTable>
                <div className="thc-footer">
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
    const instructionNames = useInstructionNames(signature, isVisible);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const isMobile = useIsMobileViewport();

    const programsBlock =
        instructionNames !== null && instructionNames.length > 0 ? (
            <InstructionList instructions={instructionNames} />
        ) : instructionNames === null ? (
            <InstructionListSkeleton />
        ) : (
            <span className="text-muted">---</span>
        );

    const handleRowClick = (e: React.MouseEvent) => {
        // Skip the drawer when the user actually clicked a real link/button in the row.
        if ((e.target as HTMLElement).closest('a, button')) return;
        if (isMobile) setDrawerOpen(true);
    };

    return (
        <>
            <BaseTable.Row ref={ref} className="tx-data-row" onClick={isMobile ? handleRowClick : undefined}>
                <BaseTable.Cell data-label="Signature">
                    <div className="tx-sig-cell">
                        <div className="flex min-w-0 items-start gap-2">
                            <span className="min-w-0">
                                <Signature signature={signature} link />
                            </span>
                            <Badge ui="dashkit" tone="soft" variant={statusClass as 'success' | 'warning'}>
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
                    <BaseTable.Cell className="w-px text-muted" data-label="Time">
                        {blockTime ? (
                            <div className="flex flex-row items-center gap-1">
                                <span className="text-dk-base">
                                    <RelativeTime date={blockTime * 1000} />
                                </span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span
                                            className="inline-flex cursor-default text-muted"
                                            style={{ lineHeight: 0 }}
                                        >
                                            <Info size={11} />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{displayTimestampUtc(blockTime * 1000, true)}</TooltipContent>
                                </Tooltip>
                            </div>
                        ) : (
                            '---'
                        )}
                    </BaseTable.Cell>
                )}

                <BaseTable.Cell className="w-px" data-label="Block">
                    <Slot slot={slot} link />
                </BaseTable.Cell>

                <BaseTable.Cell className="w-px tx-raw-data-cell" data-label="Size (bytes)">
                    <TransactionRawDataSize signature={signature} />
                </BaseTable.Cell>

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
