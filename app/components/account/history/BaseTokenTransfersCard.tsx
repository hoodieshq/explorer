import ScaledUiAmountMultiplierTooltip from '@components/account/token-extensions/ScaledUiAmountMultiplierTooltip';
import { Address } from '@components/common/Address';
import { Signature } from '@components/common/Signature';
import { Badge } from '@components/shared/ui/badge';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { Skeleton } from '@components/shared/ui/skeleton';
import { Timestamp } from '@components/shared/ui/timestamp';
import { cn } from '@components/shared/utils';
import { Card } from '@shared/ui/Card';
import { HistoryCardFooterContent } from '@shared/ui/HistoryCard';
import { ROW_PADDING } from '@shared/ui/spacing';
import type { PublicKey } from '@solana/web3.js';
import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';

export const TRANSFER_STATUS_BADGE = {
    failed: { label: 'Failed', variant: 'warning' },
    success: { label: 'Success', variant: 'success' },
} as const;

export type TransferStatus = keyof typeof TRANSFER_STATUS_BADGE;

export type TokenTransferRowView = {
    key: string;
    signature: string;
    blockTime: number | undefined;
    status: TransferStatus;
    source: PublicKey;
    destination: PublicKey;
    /** Amount after the mint's scaled UI amount multiplier. */
    amount: string;
    /** Amount before scaling, shown in the multiplier tooltip. */
    rawAmount: string;
    scaledUiAmountMultiplier: string;
    /** Token symbol; `undefined` while the token info is still loading. */
    units: string | undefined;
};

export type BaseTokenTransfersCardProps = {
    rows: TokenTransferRowView[];
    fetching: boolean;
    failed?: boolean;
    foundOldest: boolean;
    onRefresh: () => void;
    onLoadMore: () => void;
};

// A plain table rather than a card per row: tapping a transfer opens nothing, and the app keeps
// card-per-row layouts for tables whose rows are clickable (Transaction History opens a drawer). The
// frame matches the Domains tab's table (BaseDomainsCard); ARIA table roles give assistive tech the
// row/cell relationships a `<table>` would.
export function BaseTokenTransfersCard({
    rows,
    fetching,
    failed,
    foundOldest,
    onRefresh,
    onLoadMore,
}: BaseTokenTransfersCardProps) {
    const hasTimestamps = rows.some(row => row.blockTime);
    const isEmpty = rows.length === 0;

    return (
        <CollapsibleSection
            title="Token Transfers"
            collapsible={false}
            actions={
                <RefreshButton
                    analyticsSection="token_transfers_header"
                    onClick={onRefresh}
                    fetching={fetching}
                    failed={failed}
                />
            }
            className=""
        >
            <Card variant="tight" className="overflow-hidden rounded-lg border-outer-space-800 bg-outer-space-900">
                {!isEmpty && (
                    <div role="table" aria-label="Token transfers" className="text-sm text-white">
                        <div
                            role="row"
                            className={cn(
                                'hidden items-baseline gap-4 border-0 border-b border-solid border-outer-space-800 text-xs uppercase text-outer-space-300 lg:grid',
                                ROW_PADDING,
                                gridColsVariants({ timestamps: hasTimestamps }),
                            )}
                        >
                            <div role="columnheader">Transaction Signature</div>
                            {hasTimestamps && <div role="columnheader">Time</div>}
                            <div role="columnheader">Source</div>
                            <div role="columnheader">Destination</div>
                            <div role="columnheader">Amount</div>
                        </div>
                        <div role="rowgroup">
                            {rows.map(row => (
                                <TransferRow key={row.key} row={row} hasTimestamps={hasTimestamps} />
                            ))}
                        </div>
                    </div>
                )}
                <div className={footerVariants({ empty: isEmpty })}>
                    {isEmpty && foundOldest ? (
                        <div className="text-center text-outer-space-300">No transfers found</div>
                    ) : (
                        <HistoryCardFooterContent fetching={fetching} foundOldest={foundOldest} loadMore={onLoadMore} />
                    )}
                </div>
            </Card>
        </CollapsibleSection>
    );
}

// One markup for both layouts: below lg the cells stack as labelled rows, from lg up the same cells
// become grid columns under the header row. This keeps one Address/Timestamp per value instead of a
// mobile copy and a desktop copy of every row.
function TransferRow({ row, hasTimestamps }: { row: TokenTransferRowView; hasTimestamps: boolean }) {
    const badge = TRANSFER_STATUS_BADGE[row.status];

    return (
        <div
            role="row"
            className={cn(
                // The header row draws the line above the first row on desktop; on mobile the card edge does.
                'flex flex-col border-0 border-t border-solid border-outer-space-800 first:border-t-0 lg:grid lg:items-baseline lg:gap-4',
                ROW_PADDING,
                gridColsVariants({ timestamps: hasTimestamps }),
            )}
        >
            <TransferField label="Signature">
                <div className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0">
                        <Signature signature={row.signature} link />
                    </span>
                    <Badge tone="soft" variant={badge.variant}>
                        {badge.label}
                    </Badge>
                </div>
            </TransferField>

            {hasTimestamps && (
                // A row without a block time drops the Time line on mobile; on desktop the column stays
                // and shows a dash so the other cells keep their places.
                <TransferField label="Time" mobile={row.blockTime ? 'shown' : 'hidden'}>
                    {row.blockTime ? (
                        <Timestamp unixTimestamp={row.blockTime} />
                    ) : (
                        <span className="text-outer-space-300">---</span>
                    )}
                </TransferField>
            )}

            {/* Two 44-char addresses can't sit side by side at 375px, and a one-line
                    "Source → Destination" would leave ~10 visible characters per address. Each address
                    gets its own labelled line instead, and Address mid-truncates it to that width, so both
                    ends of each address stay readable and the page never scrolls sideways. */}
            <TransferField label="Source">
                <Address pubkey={row.source} link />
            </TransferField>
            <TransferField label="Destination">
                <Address pubkey={row.destination} link />
            </TransferField>

            <TransferField label="Amount">
                <TransferAmount row={row} />
            </TransferField>
        </div>
    );
}

function TransferAmount({ row }: { row: TokenTransferRowView }) {
    return (
        <div className="flex flex-wrap items-baseline gap-x-1">
            <span>{row.amount}</span>
            {row.units === undefined ? (
                // Holds the symbol's place while the token info loads, so the amount doesn't shift once it
                // arrives.
                <Skeleton aria-hidden className="h-3 w-10 self-center" />
            ) : (
                <span>{row.units}</span>
            )}
            <ScaledUiAmountMultiplierTooltip
                rawAmount={row.rawAmount}
                scaledUiAmountMultiplier={row.scaledUiAmountMultiplier}
            />
        </div>
    );
}

// Label/value pair for the mobile stack; from lg up the label hides and the pair is a bare grid cell,
// since the header row names the column. Kept local on purpose: the Instructions card (HOO-927) adds
// the same pair in parallel, and a follow-up PR merges the two.
function TransferField({
    label,
    mobile,
    children,
}: {
    label: string;
    mobile?: 'shown' | 'hidden';
    children: ReactNode;
}) {
    return (
        <div role="cell" className={fieldVariants({ mobile })}>
            <div className="w-20 flex-none text-outer-space-300 lg:hidden">{label}</div>
            <div className="flex min-w-0 flex-1 text-white">{children}</div>
        </div>
    );
}

// Desktop column track shared by the header and every row: the signature takes the slack, Source and
// Destination split what's left (Address mid-truncates to fit), Time and Amount get fixed shares. Time's
// 240px floor keeps the full timestamp and its chevron on one line, with room for longer local formats.
// Below lg the row is a flex column of labelled fields, so the track is scoped to `lg:`.
const gridColsVariants = cva('', {
    defaultVariants: { timestamps: false },
    variants: {
        timestamps: {
            false: 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(120px,16%)]',
            true: 'lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,18%)_minmax(0,1fr)_minmax(0,1fr)_minmax(120px,16%)]',
        },
    },
});

const fieldVariants = cva('min-w-0 items-baseline gap-2 py-1 lg:block lg:py-0', {
    defaultVariants: { mobile: 'shown' },
    variants: {
        mobile: {
            hidden: 'hidden',
            shown: 'flex',
        },
    },
});

// Below the rows the footer is divided off like another row; alone in an empty card it gets room for
// the empty-state line instead.
const footerVariants = cva('border-0 border-solid border-outer-space-800 px-3', {
    defaultVariants: { empty: false },
    variants: {
        empty: {
            false: 'border-t py-3',
            true: 'py-12',
        },
    },
});
