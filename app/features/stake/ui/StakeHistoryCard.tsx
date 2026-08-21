import { Epoch } from '@components/common/Epoch';
import { SolBalance } from '@components/common/SolBalance';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cn } from '@components/shared/utils';
import type { StakeHistoryEntry, SysvarStakeHistoryAccount } from '@validators/accounts/sysvar';

import { Card, CardFooter } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

// Column labels shared by both layouts so the header copy can't drift between table and grid.
const COLUMNS = ['Epoch', 'Effective (SOL)', 'Activating (SOL)', 'Deactivating (SOL)'] as const;

export type StakeHistoryLayout = 'table' | 'grid';

// The card is a collapsible section: the "Stake History" heading is lifted out above the surface with a
// chevron toggle + height animation (shared `CollapsibleSection`, `className=""` so the surface comes from
// the `<Card>` below).
//
// `layout` picks how the entries are rendered inside the card:
// - `table` (default) — the shared `<BaseTable>` (a real `<table>`), keeping the original dashkit surface.
// - `grid` — a CSS-grid list built from `div`s, mirroring the vote/token history cards. Desktop visuals
//   match `table`; below `md` each row collapses to a labels-left block so the four numeric columns stay
//   readable on a phone.
export function StakeHistoryCard({
    sysvarAccount,
    layout = 'table',
}: {
    sysvarAccount: SysvarStakeHistoryAccount;
    layout?: StakeHistoryLayout;
}) {
    const stakeHistory = sysvarAccount.info;

    return (
        <CollapsibleSection title="Stake History" className="">
            {layout === 'grid' ? (
                // Surface matched to the vote/token history grids, in pure Tailwind: `outer-space-900` bg
                // (dashkit `dk-gray-800-dark`), `outer-space-800` border (the row-separator tone), 8px radius.
                <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                    <StakeHistoryGrid entries={stakeHistory} />
                </Card>
            ) : (
                <Card ui="dashkit" marginBottom="none">
                    <StakeHistoryTable entries={stakeHistory} />
                </Card>
            )}
        </CollapsibleSection>
    );
}

// `<table>` layout — the shared BaseTable (dashkit surface) with the original Epoch / Effective /
// Activating / Deactivating columns and the "No stake history found" empty footer.
function StakeHistoryTable({ entries }: { entries: StakeHistoryEntry[] }) {
    return (
        <>
            <BaseTable ui="dashkit" variant="card" nowrap>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="w-px text-dk-gray-700">Epoch</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-right text-dk-gray-700">
                            Effective (SOL)
                        </BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-right text-dk-gray-700">
                            Activating (SOL)
                        </BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-right text-dk-gray-700">
                            Deactivating (SOL)
                        </BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>
                    {entries.map(entry => (
                        <BaseTable.Row key={entry.epoch}>
                            <BaseTable.Cell className="w-px font-mono">
                                <Epoch epoch={entry.epoch} link />
                            </BaseTable.Cell>
                            <BaseTable.Cell className="text-right font-mono">
                                <SolBalance lamports={entry.stakeHistory.effective} />
                            </BaseTable.Cell>
                            <BaseTable.Cell className="text-right font-mono">
                                <SolBalance lamports={entry.stakeHistory.activating} />
                            </BaseTable.Cell>
                            <BaseTable.Cell className="text-right font-mono">
                                <SolBalance lamports={entry.stakeHistory.deactivating} />
                            </BaseTable.Cell>
                        </BaseTable.Row>
                    ))}
                </BaseTable.Body>
            </BaseTable>

            {entries.length === 0 && (
                <CardFooter ui="dashkit">
                    <div className="text-center text-dk-gray-700">No stake history found</div>
                </CardFooter>
            )}
        </>
    );
}

// All four columns are mono numbers. The Epoch track is a fixed responsive band (`clamp(88px,15%,140px)`)
// so the number and its inline link hug the left; the three SOL columns split the rest equally
// (`minmax(0,1fr)` — the `0` min lets a long balance shrink/scroll instead of widening the grid).
const STAKE_GRID_TEMPLATE = 'grid-cols-[clamp(88px,15%,140px)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]';
const stakeHeaderCell = 'flex items-center whitespace-nowrap px-3 py-2.5 text-xs uppercase text-outer-space-300';
const stakeBodyCell = 'flex items-center border-t border-solid border-outer-space-800 px-3 py-2.5 font-mono';

// CSS-grid layout. Desktop (md+) is a single 4-column grid so header and rows share the same tracks the
// way a `<table>` does; `contents` row wrappers keep ARIA structure without breaking that alignment.
// Below `md` each entry becomes a labels-left block so the four numeric columns don't get crushed.
function StakeHistoryGrid({ entries }: { entries: StakeHistoryEntry[] }) {
    return (
        <>
            {/* Mobile (< md): labels-left list. */}
            <div className="md:hidden">
                {entries.length > 0 ? (
                    entries.map(entry => <MobileStakeHistoryRow key={entry.epoch} entry={entry} />)
                ) : (
                    <div className="px-3 py-3 text-center text-outer-space-300">No stake history found</div>
                )}
            </div>

            {/* Desktop (md+): CSS-grid table. */}
            <div className="hidden w-full overflow-x-auto text-sm text-white md:block">
                <div role="table" aria-label="Stake history" className={cn('grid min-w-full', STAKE_GRID_TEMPLATE)}>
                    <div role="row" className="contents">
                        {COLUMNS.map((label, i) => (
                            // Epoch (first column) stays left; the SOL columns are right-aligned so the
                            // header labels sit over their right-aligned numbers.
                            <div
                                key={label}
                                role="columnheader"
                                className={cn(stakeHeaderCell, i > 0 && 'justify-end')}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                    {entries.length > 0 ? (
                        entries.map(entry => <GridStakeHistoryRow key={entry.epoch} entry={entry} />)
                    ) : (
                        <div role="row" className="contents">
                            <div
                                role="cell"
                                className="col-span-4 border-t border-solid border-outer-space-800 px-3 py-2.5 text-center text-outer-space-300"
                            >
                                No stake history found
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function GridStakeHistoryRow({ entry }: { entry: StakeHistoryEntry }) {
    return (
        <div role="row" className="contents">
            <div role="cell" className={cn(stakeBodyCell, 'whitespace-nowrap')}>
                <Epoch epoch={entry.epoch} link />
            </div>
            <div role="cell" className={cn(stakeBodyCell, 'min-w-0 justify-end')}>
                <SolBalance lamports={entry.stakeHistory.effective} />
            </div>
            <div role="cell" className={cn(stakeBodyCell, 'min-w-0 justify-end')}>
                <SolBalance lamports={entry.stakeHistory.activating} />
            </div>
            <div role="cell" className={cn(stakeBodyCell, 'min-w-0 justify-end')}>
                <SolBalance lamports={entry.stakeHistory.deactivating} />
            </div>
        </div>
    );
}

function MobileStakeHistoryRow({ entry }: { entry: StakeHistoryEntry }) {
    return (
        <div className="flex flex-col gap-1 border-t border-solid border-outer-space-800 px-3 py-3 text-sm text-white first:border-t-0">
            <div className="flex items-start gap-2">
                <span className="w-36 shrink-0 text-outer-space-300">Epoch</span>
                <div className="min-w-0 flex-1 font-mono">
                    <Epoch epoch={entry.epoch} link />
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-36 shrink-0 text-outer-space-300">Effective (SOL)</span>
                <div className="min-w-0 flex-1 font-mono">
                    <SolBalance lamports={entry.stakeHistory.effective} />
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-36 shrink-0 text-outer-space-300">Activating (SOL)</span>
                <div className="min-w-0 flex-1 font-mono">
                    <SolBalance lamports={entry.stakeHistory.activating} />
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="w-36 shrink-0 text-outer-space-300">Deactivating (SOL)</span>
                <div className="min-w-0 flex-1 font-mono">
                    <SolBalance lamports={entry.stakeHistory.deactivating} />
                </div>
            </div>
        </div>
    );
}
