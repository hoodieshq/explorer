import { Slot } from '@components/common/Slot';
import { TruncatedValue } from '@components/shared/TruncatedValue';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { SlotHashEntry, SlotHashesInfo, SysvarAccount } from '@validators/accounts/sysvar';
import { cva } from 'class-variance-authority';
import React from 'react';

import { Card } from '@/app/shared/ui/Card';

const GRID_COLUMNS = ['Slot', 'Hash'] as const;

// A collapsible section: the "Slot Hashes" heading is lifted out above the surface (shared
// `CollapsibleSection`, `className=""` so the surface comes from the `<Card>` below), holding a CSS-grid
// list built from `div`s, mirroring the Vote History card.
export function SlotHashesCard({ sysvarAccount }: { sysvarAccount: SysvarAccount }) {
    const slotHashes = sysvarAccount.info as SlotHashesInfo;

    return (
        <CollapsibleSection title="Slot Hashes" className="">
            {/* Same surface as the Vote History grid card; `border-outer-space-800` matches the row
                separators. `!` because `cn` has no tailwind-merge, and the tw card's own `rounded-xl`
                would otherwise win. */}
            <Card variant="tight" className="!rounded-lg border-outer-space-800 bg-outer-space-900">
                <SlotHashesGrid entries={slotHashes} />
            </Card>
        </CollapsibleSection>
    );
}

// `gridCellVariants` owns all grid cell styling. `role` picks header vs body chrome; header cells leave
// `column` at its default.
const gridCellVariants = cva('flex px-3 py-2.5', {
    defaultVariants: { column: 'none', role: 'body' },
    variants: {
        column: {
            // The hash wraps instead of truncating or scrolling. A 44-char mono hash needs ~370px, more
            // than the column gets on a 375px phone. Mid-truncation would hide the characters people compare
            // and copy, and a horizontal scroll would hide most of the hash behind a swipe. `break-all` keeps
            // the full value visible and selectable at the cost of a second line on phones; on desktop it
            // still fits on one line. `min-w-0` lets the `1fr` track shrink below the hash's width.
            hash: 'min-w-0 break-all font-mono',
            none: '',
            slot: 'whitespace-nowrap font-mono',
        },
        // `header`: muted uppercase `text-xs` labels. `body`: `outer-space-800` top border (same tone as
        // the card border) as the row separator; top-aligned so the slot lines up with the first line of
        // a wrapped hash.
        role: {
            body: 'items-start border-t border-solid border-outer-space-800',
            header: 'items-center whitespace-nowrap text-xs uppercase text-outer-space-300',
        },
    },
});

// A single 2-column grid so header and rows share the same tracks the way a `<table>` does. The Slot
// track is the Vote History band (`clamp(132px,25%,200px)`); Hash takes the rest.
function SlotHashesGrid({ entries }: { entries: SlotHashEntry[] }) {
    return (
        <div className="w-full text-sm text-white">
            {/* `contents` row wrappers generate no box, so the cells stay direct grid items: ARIA rows for
                screen readers without breaking the column alignment. */}
            <div role="table" aria-label="Slot hashes" className="grid grid-cols-[clamp(132px,25%,200px)_1fr]">
                <div role="row" className="contents">
                    {GRID_COLUMNS.map(label => (
                        <div key={label} role="columnheader" className={gridCellVariants({ role: 'header' })}>
                            {label}
                        </div>
                    ))}
                </div>
                {entries.length > 0 ? (
                    entries.map(entry => (
                        <div key={entry.slot} role="row" className="contents">
                            <div role="cell" className={gridCellVariants({ column: 'slot' })}>
                                <Slot slot={entry.slot} link />
                            </div>
                            <div role="cell" className={gridCellVariants({ column: 'hash' })}>
                                {/* Same rendering as the transaction Summary signature: the copy icon keeps
                                    its own column and the wrapped hash lines stay aligned beside it. */}
                                <TruncatedValue value={entry.hash} truncation={{ enabled: false }} alignItems="start" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div role="row" className="contents">
                        <div
                            role="cell"
                            className="col-span-2 border-t border-solid border-outer-space-800 px-3 py-2.5 text-center text-outer-space-300"
                        >
                            No hashes found
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
