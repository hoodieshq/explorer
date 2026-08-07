'use client';

import { Signature } from '@components/common/Signature';
import { Slot } from '@components/common/Slot';
import { cn } from '@components/shared/utils';
import { HistoryCardFooter, HistoryCardHeader } from '@shared/ui/HistoryCard';
import { displayTimestampUtc, unixTimestampToMs } from '@utils/date';
import React, { type ReactNode } from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { RelativeTime } from '@/app/shared/RelativeTime';
import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

// Design variant, switchable via prop:
//   - 'default' — the original Dashkit table (Signature / Block / Age / Timestamp / Result / Raw Data).
//   - 'grid'    — the rearranged CSS-grid layout: the Result badge moves inline next to the signature
//                 (instructions below), Age + Timestamp collapse into one "Time" column, and Block /
//                 Size keep their own columns. Every field from the row model still gets a column.
export type TransactionHistoryVariant = 'default' | 'grid';

export type TransactionHistoryRowView = {
    signature: string;
    slot: number;
    blockTime: number | null | undefined;
    status: 'success' | 'failed';
    // Cells whose content needs per-row hooks (lazy, on-visible / on-hover fetching), injected by the
    // container so this card stays pure.
    instructionsCell: ReactNode;
    rawDataCell: ReactNode;
};

export type BaseTransactionHistoryCardProps = {
    rows: TransactionHistoryRowView[];
    fetching: boolean;
    foundOldest: boolean;
    onRefresh: () => void;
    onLoadMore: () => void;
    headerActions?: ReactNode;
    headerSubRow?: ReactNode;
    variant?: TransactionHistoryVariant;
};

export function BaseTransactionHistoryCard({
    rows,
    fetching,
    foundOldest,
    onRefresh,
    onLoadMore,
    headerActions,
    headerSubRow,
    variant = 'default',
}: BaseTransactionHistoryCardProps) {
    const hasTimestamps = rows.some(row => row.blockTime);

    return (
        <Card ui="dashkit">
            <HistoryCardHeader
                title="Transaction History"
                analyticsSection="transaction_history_header"
                refresh={onRefresh}
                fetching={fetching}
                actions={headerActions}
                subHeader={headerSubRow}
            />
            {variant === 'grid' ? (
                <TransactionGrid rows={rows} />
            ) : (
            <BaseTable ui="dashkit" variant="card" nowrap>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="w-px text-dk-gray-700">
                            Transaction Signature
                        </BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="w-px text-dk-gray-700">Block</BaseTable.HeaderCell>
                        {hasTimestamps && (
                            <>
                                <BaseTable.HeaderCell className="w-px text-dk-gray-700">Age</BaseTable.HeaderCell>
                                <BaseTable.HeaderCell className="w-px text-dk-gray-700">Timestamp</BaseTable.HeaderCell>
                            </>
                        )}
                        <BaseTable.HeaderCell className="text-dk-gray-700">Result</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Raw Data</BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>
                    {rows.map(row => (
                        <TransactionRow key={row.signature} row={row} hasTimestamps={hasTimestamps} />
                    ))}
                </BaseTable.Body>
            </BaseTable>
            )}
            <HistoryCardFooter fetching={fetching} foundOldest={foundOldest} loadMore={onLoadMore} />
        </Card>
    );
}

// Domain status → how the Result column renders it. The card owns this mapping so Badge's variant
// names ('warning' for a failed tx) never leak into the row's data model.
const STATUS_BADGE = {
    failed: { label: 'Failed', variant: 'warning' },
    success: { label: 'Success', variant: 'success' },
} as const;

function TransactionRow({
    row: { signature, slot, blockTime, status, instructionsCell, rawDataCell },
    hasTimestamps,
}: {
    row: TransactionHistoryRowView;
    hasTimestamps: boolean;
}) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell>
                <Signature signature={signature} link />
                {instructionsCell}
            </BaseTable.Cell>

            <BaseTable.Cell className="w-px">
                <Slot slot={slot} link />
            </BaseTable.Cell>

            {hasTimestamps && (
                <>
                    <BaseTable.Cell className="text-dk-gray-700">
                        {blockTime ? <RelativeTime date={unixTimestampToMs(blockTime)} /> : '---'}
                    </BaseTable.Cell>
                    <BaseTable.Cell className="text-dk-gray-700">
                        {blockTime ? displayTimestampUtc(unixTimestampToMs(blockTime), true) : '---'}
                    </BaseTable.Cell>
                </>
            )}

            <BaseTable.Cell>
                <Badge ui="dashkit" variant={STATUS_BADGE[status].variant}>
                    {STATUS_BADGE[status].label}
                </Badge>
            </BaseTable.Cell>
            <BaseTable.Cell>{rawDataCell}</BaseTable.Cell>
        </BaseTable.Row>
    );
}

// Signature takes the slack; Time / Block / Size are capped. Header + rows share this template so
// columns stay aligned. Inline (not a `grid-cols-[…]` class) so the Storybook JIT can't purge it.
const GRID_TEMPLATE: React.CSSProperties = {
    gridTemplateColumns: 'minmax(240px,1fr) minmax(auto,17rem) minmax(auto,11rem) minmax(auto,7rem)',
};
const GRID_HEADERS = ['Transaction Signature', 'Time', 'Block', 'Size (Bytes)'] as const;

// 'grid' variant — the screenshot layout. Header and every row are separate CSS grids sharing the same
// inline column template, stacked in a fixed-min-width track that scrolls horizontally on narrow
// screens — so the columns stay aligned like a table (same approach as the block grid cards).
function TransactionGrid({ rows }: { rows: TransactionHistoryRowView[] }) {
    return (
        <div className="overflow-x-auto text-sm text-white">
            <div style={{ minWidth: '760px' }}>
                <div
                    style={GRID_TEMPLATE}
                    className="grid gap-5 border-0 border-b border-solid border-dark-border px-4 py-2.5 text-xs uppercase text-dk-gray-700"
                >
                    {GRID_HEADERS.map(label => (
                        <div key={label}>{label}</div>
                    ))}
                </div>
                {rows.map(row => (
                    <TransactionGridRow key={row.signature} row={row} />
                ))}
            </div>
        </div>
    );
}

function TransactionGridRow({
    row: { signature, slot, blockTime, status, instructionsCell, rawDataCell },
}: {
    row: TransactionHistoryRowView;
}) {
    return (
        <div
            style={GRID_TEMPLATE}
            className={cn(
                'grid items-start gap-5 px-4 py-3',
                'border-0 border-b border-solid border-dark-border last:border-b-0',
            )}
        >
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Signature signature={signature} link />
                    <Badge ui="dashkit" variant={STATUS_BADGE[status].variant}>
                        {STATUS_BADGE[status].label}
                    </Badge>
                </div>
                {instructionsCell}
            </div>

            <div className="min-w-0">
                {blockTime ? (
                    <div className="flex flex-col">
                        <span>{displayTimestampUtc(unixTimestampToMs(blockTime), true)}</span>
                        <span className="text-dk-gray-700">
                            <RelativeTime date={unixTimestampToMs(blockTime)} />
                        </span>
                    </div>
                ) : (
                    '---'
                )}
            </div>

            <div className="min-w-0">
                <Slot slot={slot} link />
            </div>

            <div className="min-w-0">{rawDataCell}</div>
        </div>
    );
}
