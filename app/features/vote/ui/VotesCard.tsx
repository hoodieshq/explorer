import { Slot } from '@components/common/Slot';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cva } from 'class-variance-authority';

import { Card, CardFooter } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

import { Vote, VoteAccount } from '../lib/validators';

// Column labels shared by both layouts so the header copy can't drift between table and grid.
const COLUMNS = ['Slot', 'Confirmation Count'] as const;

export type VotesLayout = 'table' | 'grid';

// The card is a collapsible section: the "Vote History" heading is lifted out above the surface with a
// chevron toggle + height animation (shared `CollapsibleSection`, `className=""` so the surface comes
// from the `<Card>` below).
//
// `layout` picks how the vote list is rendered inside the card:
// - `table` (default) — the shared `<BaseTable>` (a real `<table>`), keeping the original dashkit surface.
// - `grid` — a CSS-grid list built from `div`s, mirroring the transaction page's Accounts/Token Balances
//   tables. Desktop visuals match `table`; the internals differ so the two can diverge on mobile later.
export function VotesCard({ voteAccount, layout = 'table' }: { voteAccount: VoteAccount; layout?: VotesLayout }) {
    // Newest vote first, matching the original table order.
    const votes = [...voteAccount.info.votes].reverse();

    return (
        <CollapsibleSection title="Vote History" className="">
            {layout === 'grid' ? (
                // Surface matched to the transaction Tokens/Accounts card, in pure Tailwind: bg
                // `outer-space-900` equals `#1e2423` (dashkit `dk-gray-800-dark`); `border-outer-space-800`
                // gives the card the same tone as the row separators; `rounded-lg` is the 8px radius.
                <Card variant="tight" className="!rounded-lg border-outer-space-800 bg-outer-space-900">
                    <VotesGrid votes={votes} />
                </Card>
            ) : (
                <Card ui="dashkit" marginBottom="none">
                    <VotesTable votes={votes} />
                </Card>
            )}
        </CollapsibleSection>
    );
}

// `<table>` layout — the shared BaseTable (dashkit surface) with the original Slot / Confirmation Count
// columns and the "No votes found" empty footer.
function VotesTable({ votes }: { votes: Vote[] }) {
    return (
        <>
            <BaseTable ui="dashkit" variant="card" nowrap>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="w-px text-dk-gray-700">Slot</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Confirmation Count</BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>
                    {votes.map(vote => (
                        <BaseTable.Row key={vote.slot}>
                            <BaseTable.Cell className="w-px font-mono">
                                <Slot slot={vote.slot} link />
                            </BaseTable.Cell>
                            <BaseTable.Cell className="font-mono">{vote.confirmationCount}</BaseTable.Cell>
                        </BaseTable.Row>
                    ))}
                </BaseTable.Body>
            </BaseTable>

            <CardFooter ui="dashkit">
                <div className="text-center text-dk-gray-700">{votes.length > 0 ? '' : 'No votes found'}</div>
            </CardFooter>
        </>
    );
}

// `gridCellVariants` owns all cell styling. `role` picks header vs body chrome; body cells are mono to
// keep the numeric columns aligned (same as the table). Header cells leave `column` at its default.
const gridCellVariants = cva('flex px-3 py-2.5', {
    defaultVariants: { column: 'none', role: 'body' },
    variants: {
        // Per-column body concerns. Column widths are set on the grid track (see `VotesGrid`); here
        // `slot` stays a mono number on one line, while `count` uses the default (non-mono) font and
        // collapses to `min-w-0`.
        column: {
            count: 'min-w-0 whitespace-nowrap',
            none: '',
            slot: 'whitespace-nowrap font-mono',
        },
        // Header vs body chrome. `header`: muted uppercase `text-xs` labels. `body`: `outer-space-800`
        // top border (same tone as the card border) as the row separator.
        role: {
            body: 'items-center border-t border-solid border-outer-space-800',
            header: 'items-center whitespace-nowrap text-xs uppercase text-outer-space-300',
        },
    },
});

// CSS-grid layout — a single 2-column grid so columns stay aligned across header and rows the way a
// `<table>`'s shared columns do. The Slot column follows the transaction Summary card's ratio, raising
// the floor to 132px (`clamp(132px,25%,200px)`): a fixed responsive band 132–200px targeting 25% of the
// width, with Confirmation Count taking the rest (`1fr`).
function VotesGrid({ votes }: { votes: Vote[] }) {
    return (
        <div className="w-full overflow-x-auto text-sm text-white">
            {/* `role="table"` + `role="row"` wrappers restore the semantics the old `<table>` gave screen
                readers. The row wrappers use `contents` (`display: contents`) so they generate no box and
                their cells stay direct participants in this grid — ARIA structure without disturbing the
                CSS-grid column alignment. */}
            <div
                role="table"
                aria-label="Vote history"
                className="grid min-w-full grid-cols-[clamp(132px,25%,200px)_1fr]"
            >
                <div role="row" className="contents">
                    {COLUMNS.map(label => (
                        <div key={label} role="columnheader" className={gridCellVariants({ role: 'header' })}>
                            {label}
                        </div>
                    ))}
                </div>
                {votes.length > 0 ? (
                    votes.map(vote => (
                        <div key={vote.slot} role="row" className="contents">
                            <div role="cell" className={gridCellVariants({ column: 'slot' })}>
                                <Slot slot={vote.slot} link />
                            </div>
                            <div role="cell" className={gridCellVariants({ column: 'count' })}>
                                {vote.confirmationCount}
                            </div>
                        </div>
                    ))
                ) : (
                    <div role="row" className="contents">
                        <div
                            role="cell"
                            className="col-span-2 border-t border-solid border-outer-space-800 px-3 py-2.5 text-center text-outer-space-300"
                        >
                            No votes found
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
