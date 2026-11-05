'use client';

import { LookupTableEntriesCard } from '@components/account/address-lookup-table/LookupTableEntriesCard';
import { isAddressLookupTableAccount } from '@components/account/address-lookup-table/types';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL, isParsedAccountProgram } from '@explorer/parsers';
import { Address } from '@solana/kit';
import React from 'react';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function AddressLookupTableEntriesRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const parsedData = account?.data.parsed;
    const rawData = account?.data.raw;
    // The card carries no trailing margin; `pb-14` plus the root layout's `pb-6` leaves ~80px above the footer, as
    // the redesigned pages ask for.
    if (
        isParsedAccountProgram(parsedData, ADDRESS_LOOKUP_TABLE_PROGRAM_LABEL) &&
        parsedData.parsed.type === 'lookupTable'
    ) {
        return (
            <div className="pb-14">
                <LookupTableEntriesCard parsedLookupTable={parsedData.parsed.info} />
            </div>
        );
    } else if (rawData && isAddressLookupTableAccount(account.owner.toBase58() as Address, rawData)) {
        return (
            <div className="pb-14">
                <LookupTableEntriesCard lookupTableAccountData={rawData} />
            </div>
        );
    } else {
        return onNotFound();
    }
}

export default function AddressLookupTableEntriesPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={AddressLookupTableEntriesRenderer} />;
}
