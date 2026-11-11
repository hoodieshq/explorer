import { Address } from '@components/common/Address';
import { AddressLookupTableAccount, PublicKey } from '@solana/web3.js';
import { AddressLookupTableAccountInfo } from '@validators/accounts/address-lookup-table';
import React from 'react';

import { GridTableCard, type GridTableColumn } from '@/app/shared/ui/grid-table';

const COLUMNS: ReadonlyArray<GridTableColumn<{ entry: PublicKey; index: number }>> = [
    {
        cellClassName: 'whitespace-nowrap font-mono',
        header: 'Index',
        render: ({ index }) => index,
    },
    {
        // `min-w-0` lets the address mid-truncate inside the cell instead of scrolling the page.
        cellClassName: 'min-w-0 font-mono',
        header: 'Address',
        render: ({ entry }) => <Address pubkey={entry} link />,
    },
];

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

    const rows = lookupTableState.addresses.map((entry, index) => ({ entry, index }));

    return (
        <GridTableCard
            title="Lookup Table Entries"
            ariaLabel="Lookup table entries"
            gridTemplate="grid-cols-[auto_minmax(0,1fr)]"
            columns={COLUMNS}
            rows={rows}
            getRowKey={({ index }) => index}
            empty="No entries found"
        />
    );
}
