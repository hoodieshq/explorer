import { Address } from '@components/common/Address';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { AddressLookupTableAccount, PublicKey } from '@solana/web3.js';
import { AddressLookupTableAccountInfo } from '@validators/accounts/address-lookup-table';
import { cva } from 'class-variance-authority';
import React from 'react';

import { Card } from '@/app/shared/ui/Card';

const GRID_COLUMNS = ['Index', 'Address'] as const;

// A collapsible section: the "Lookup Table Entries" heading sits above the surface (shared `CollapsibleSection`,
// `className=""` so the surface comes from the `<Card>` below), holding a CSS-grid table built from `div`s, the same
// shape as the Slot Hashes card.
export function LookupTableEntriesCard(
    params:
        | {
              parsedLookupTable: AddressLookupTableAccountInfo;
          }
        | {
              lookupTableAccountData: Uint8Array;
          },
) {
    const lookupTableState = React.useMemo(() => {
        if ('lookupTableAccountData' in params) {
            return AddressLookupTableAccount.deserialize(params.lookupTableAccountData);
        } else {
            return params.parsedLookupTable;
        }
    }, [params]);

    return (
        <CollapsibleSection title="Lookup Table Entries" className="">
            {/* `Card` merges classes with tailwind-merge, so these replace its own radius and colours: the
                same surface as the Slot Hashes card, with `border-outer-space-800` matching the row separators. */}
            <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                <EntriesGrid addresses={lookupTableState.addresses} />
            </Card>
        </CollapsibleSection>
    );
}

// `gridCellVariants` owns all grid cell styling. `role` picks header vs body chrome; header cells leave `column` at
// its default.
const gridCellVariants = cva('flex px-3 py-2.5', {
    defaultVariants: { column: 'none', role: 'body' },
    variants: {
        column: {
            // The address mid-truncates (`So111…11112`) when the column is narrower than the full 44 characters,
            // which happens on phones. Each row is a link to an account, and the full address stays one tap away
            // in the tooltip, the copy button and the account page. Wrapping it instead, as the Slot Hashes card
            // does with its hashes, would double the height of every row in a table of up to 256 entries.
            // `min-w-0` lets the `1fr` track shrink below the address's width; `Address` measures the full text
            // in an invisible span inside its own `overflow-x-clip` row, so that span cannot widen the page.
            address: 'min-w-0',
            // Plain text, as the numbers in the transaction Summary.
            index: 'whitespace-nowrap',
            none: '',
        },
        // `header`: muted uppercase `text-xs` labels. `body`: `outer-space-800` top border (same tone as the card
        // border) as the row separator; top-aligned so the index lines up with the address text.
        role: {
            body: 'items-start border-t border-solid border-outer-space-800',
            header: 'items-center whitespace-nowrap text-xs uppercase text-outer-space-300',
        },
    },
});

// A single 2-column grid so the header and rows share the same tracks, the way a `<table>` does. Index is at most
// 255, so its track is `auto` and hugs the wider of the "Index" label and the numbers; Address takes the rest.
function EntriesGrid({ addresses }: { addresses: PublicKey[] }) {
    return (
        <div className="w-full text-sm text-white">
            {/* `contents` row wrappers generate no box, so the cells stay direct grid items: ARIA rows for screen
                readers without breaking the column alignment. */}
            <div role="table" aria-label="Lookup table entries" className="grid grid-cols-[auto_minmax(0,1fr)]">
                <div role="row" className="contents">
                    {GRID_COLUMNS.map(label => (
                        <div key={label} role="columnheader" className={gridCellVariants({ role: 'header' })}>
                            {label}
                        </div>
                    ))}
                </div>
                {addresses.length > 0 ? (
                    addresses.map((entry, index) => (
                        // Index key: a lookup table may hold the same address more than once, and the position is
                        // what identifies an entry.
                        <div key={index} role="row" className="contents">
                            <div role="cell" className={gridCellVariants({ column: 'index' })}>
                                {index}
                            </div>
                            <div role="cell" className={gridCellVariants({ column: 'address' })}>
                                <Address pubkey={entry} link />
                            </div>
                        </div>
                    ))
                ) : (
                    <div role="row" className="contents">
                        <div
                            role="cell"
                            className="col-span-2 border-t border-solid border-outer-space-800 px-3 py-2.5 text-center text-outer-space-300"
                        >
                            No entries found
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
