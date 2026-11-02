import { Address } from '@components/common/Address';
import { Signature } from '@components/common/Signature';
import { Badge } from '@components/shared/ui/badge';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { Timestamp } from '@components/shared/ui/timestamp';
import { cn } from '@components/shared/utils';
import { Card } from '@shared/ui/Card';
import { HistoryCardFooterContent } from '@shared/ui/HistoryCard';
import { ROW_PADDING } from '@shared/ui/spacing';
import type { Address as AddressType } from '@solana/kit';
import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';

const STATUS_BADGE = {
    failed: { label: 'Failed', variant: 'warning' },
    success: { label: 'Success', variant: 'success' },
} as const;

export type TokenInstructionStatus = keyof typeof STATUS_BADGE;

export type TokenInstructionRowView = {
    // One transaction can hold several matching instructions, so the signature alone is not unique.
    key: string;
    signature: string;
    blockTime: number | null | undefined;
    status: TokenInstructionStatus;
    instructionName: string;
    programId: AddressType;
};

export type BaseTokenInstructionsCardProps = {
    rows: TokenInstructionRowView[];
    fetching: boolean;
    failed?: boolean;
    foundOldest: boolean;
    onRefresh: () => void;
    onLoadMore: () => void;
};

export function BaseTokenInstructionsCard({
    rows,
    fetching,
    failed,
    foundOldest,
    onRefresh,
    onLoadMore,
}: BaseTokenInstructionsCardProps) {
    const hasTimestamps = rows.some(row => row.blockTime);
    const isEmpty = rows.length === 0;

    const header = !isEmpty ? (
        <div
            className={cn(
                'hidden items-start gap-4 text-xs uppercase text-outer-space-300 md:grid',
                ROW_PADDING,
                gridColsVariants({ timestamps: hasTimestamps }),
            )}
        >
            <div>Transaction Signature</div>
            {hasTimestamps && <div>Time</div>}
            <div>Instruction</div>
            <div>Program</div>
        </div>
    ) : undefined;

    const footer = (
        <div className={footerVariants({ empty: isEmpty })}>
            {isEmpty && foundOldest ? (
                <div className="text-center text-outer-space-300">No instructions found</div>
            ) : (
                <HistoryCardFooterContent fetching={fetching} foundOldest={foundOldest} loadMore={onLoadMore} />
            )}
        </div>
    );

    // A table on every width, not a list of cards: a row here leads nowhere on click, and stacked cards are
    // kept for rows that open something (the Transaction History drawer). Below md each row stacks its
    // cells, but the rows still share one frame and are split by dividers, as in the Stake History table.
    return (
        <CollapsibleSection
            title="Token Instructions"
            collapsible={false}
            className=""
            actions={
                <RefreshButton
                    analyticsSection="token_instructions_header"
                    onClick={onRefresh}
                    fetching={fetching}
                    failed={failed}
                />
            }
        >
            <Card variant="tight" className="overflow-hidden rounded-lg border-outer-space-800 bg-outer-space-900">
                {header}
                {!isEmpty && (
                    <div>
                        {rows.map(row => (
                            <InstructionRow key={row.key} row={row} hasTimestamps={hasTimestamps} />
                        ))}
                    </div>
                )}
                {footer}
            </Card>
        </CollapsibleSection>
    );
}

// One markup for both layouts: below md the cells stack as labelled lines, from md up the same cells
// become grid columns under the header row. This keeps one Address/Timestamp per value instead of a
// mobile copy and a desktop copy of every row.
function InstructionRow({ row, hasTimestamps }: { row: TokenInstructionRowView; hasTimestamps: boolean }) {
    const badge = STATUS_BADGE[row.status];

    return (
        <div
            className={cn(
                // On mobile the header row is hidden, so the first row drops its divider against the frame.
                'flex flex-col border-0 border-t border-solid border-outer-space-800 text-sm first:border-t-0 md:grid md:items-start md:gap-4 md:first:border-t',
                ROW_PADDING,
                gridColsVariants({ timestamps: hasTimestamps }),
            )}
        >
            <InstructionField label="Signature">
                <div className="flex min-w-0 items-start gap-2">
                    <span className="min-w-0">
                        {/* Signature centres its content by default; table cells here are top-aligned. */}
                        <Signature signature={row.signature} link alignItems="start" />
                    </span>
                    <Badge tone="soft" variant={badge.variant}>
                        {badge.label}
                    </Badge>
                </div>
            </InstructionField>

            {hasTimestamps && (
                // A row without a block time drops the Time line on mobile; on desktop the column stays
                // and shows a dash so the other cells keep their places.
                <InstructionField label="Time" mobile={row.blockTime ? 'shown' : 'hidden'}>
                    {row.blockTime ? (
                        <Timestamp unixTimestamp={row.blockTime} />
                    ) : (
                        <span className="text-outer-space-300">---</span>
                    )}
                </InstructionField>
            )}

            <InstructionField label="Instruction">{row.instructionName}</InstructionField>
            <InstructionField label="Program">
                <Address address={row.programId} link />
            </InstructionField>
        </div>
    );
}

// Label/value pair for the mobile stack; from md up the label hides and the pair is a bare grid cell,
// since the header row names the column. Kept local on purpose: the Transfers card (HOO-937) adds the
// same pair in parallel, and a follow-up PR merges the two.
function InstructionField({
    label,
    mobile,
    children,
}: {
    label: string;
    mobile?: 'shown' | 'hidden';
    children: ReactNode;
}) {
    return (
        <div className={fieldVariants({ mobile })}>
            <div className="w-20 flex-none text-outer-space-300 md:hidden">{label}</div>
            <div className="flex min-w-0 flex-1 text-white">{children}</div>
        </div>
    );
}

// Desktop column track shared by the header and every row: the signature takes the most slack, the other
// columns an equal share (Address mid-truncates to fit). The signature never goes below 184px, the width
// of a mid-truncated signature with its copy icon plus the Success badge (measured at 181px), so the badge
// stays beside the signature instead of clipping it. Time never goes below 204px: the UTC timestamp and
// its chevron take 199-216px depending on the digits, so at md the wider ones wrap "UTC" onto a second
// line, which the top-aligned row absorbs. Shares (fr), not content sizes: the header and each row are
// separate grids, and content-sized tracks would differ between them. Below md the row is a flex column
// of labelled fields, so the track is scoped to `md:`.
const gridColsVariants = cva('', {
    defaultVariants: { timestamps: false },
    variants: {
        timestamps: {
            false: 'md:grid-cols-[minmax(184px,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]',
            true: 'md:grid-cols-[minmax(184px,1.2fr)_minmax(204px,1fr)_minmax(0,1fr)_minmax(0,1fr)]',
        },
    },
});

const fieldVariants = cva('min-w-0 items-start gap-2 py-1 md:block md:py-0', {
    defaultVariants: { mobile: 'shown' },
    variants: {
        mobile: {
            hidden: 'hidden',
            shown: 'flex',
        },
    },
});

// The footer sits inside the frame on every width. Under rows it gets a divider; an empty list gets room
// for the empty-state line instead.
const footerVariants = cva('border-0 border-solid border-outer-space-800 px-3', {
    defaultVariants: { empty: false },
    variants: {
        empty: {
            false: 'border-t py-3',
            true: 'py-12',
        },
    },
});
