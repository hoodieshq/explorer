import { AddressFromLookupTableWithContext, AddressWithContext } from '@components/inspector/AddressWithContext';
import { fillAddressTableLookupsAccounts, findLookupAddress } from '@components/inspector/utils';
import { VersionedMessage, AddressLookupTableAccount } from '@solana/web3.js';
import React from 'react';

export function AddressTableLookupAddress({
    accountIndex,
    message,
    hideInfo,
    lookupTableAccounts,
}: {
    accountIndex: number;
    message: VersionedMessage;
    hideInfo?: boolean;
    lookupTableAccounts?: AddressLookupTableAccount[];
}) {
    const lookupsForAccountKeyIndex = fillAddressTableLookupsAccounts(message.addressTableLookups);
    const { lookup, dynamicLookups } = findLookupAddress(accountIndex, message, lookupsForAccountKeyIndex, lookupTableAccounts);

    return (
        <>
            {dynamicLookups.isStatic ? (
                <AddressWithContext pubkey={lookup} hideInfo={hideInfo} />
            ) : (
                <AddressFromLookupTableWithContext
                    lookupTableKey={dynamicLookups.lookups.lookupTableKey}
                    lookupTableIndex={dynamicLookups.lookups.lookupTableIndex}
                    hideInfo={hideInfo}
                />
            )}
        </>
    );
}
