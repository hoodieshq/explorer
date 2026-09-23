import type { Address } from '@solana/kit';

import type { AddressTableLookup, TransactionAccount, TransactionVersion } from './types.js';

type MessageHeader = {
    numReadonlyNonSignerAccounts: number;
    numReadonlySignerAccounts: number;
    numSignerAccounts: number;
};

export type AccountResolutionParams = {
    addressTableLookups?: readonly AddressTableLookup[];
    header: MessageHeader;
    loadedAddresses?: { readonly: readonly Address[]; writable: readonly Address[] } | null;
    staticKeys: readonly Address[];
    version: TransactionVersion;
};

export type AccountResolutionResult = {
    accounts: TransactionAccount[];
    /** Loaded addresses not found in a listed lookup table. Absent when the message listed no tables. */
    unmatchedLookupTableAddresses?: readonly Address[];
};

/**
 * Only v0 can load addresses from lookup tables.
 * Legacy and v1 resolve their static keys alone.
 */
export function resolveAccounts(params: AccountResolutionParams): AccountResolutionResult {
    const staticAccounts = classifyStaticKeys(params.staticKeys, params.header);
    if (params.version !== 0) {
        return { accounts: staticAccounts };
    }

    const loadedWritable = params.loadedAddresses?.writable ?? [];
    const loadedReadonly = params.loadedAddresses?.readonly ?? [];
    const { readonlyMap, writableMap } = buildLookupTableMap(params.addressTableLookups);

    const accounts = [
        ...staticAccounts,
        ...loadedWritable.map((address, i) => toLoadedAccount(address, writableMap[i], true)),
        ...loadedReadonly.map((address, i) => toLoadedAccount(address, readonlyMap[i], false)),
    ];

    const unmatched =
        params.addressTableLookups === undefined
            ? []
            : [...loadedWritable.slice(writableMap.length), ...loadedReadonly.slice(readonlyMap.length)];

    return { accounts, ...(unmatched.length > 0 ? { unmatchedLookupTableAddresses: unmatched } : {}) };
}

function classifyStaticKeys(staticKeys: readonly Address[], header: MessageHeader): TransactionAccount[] {
    const { numReadonlyNonSignerAccounts, numReadonlySignerAccounts, numSignerAccounts } = header;
    const readonlySignerStart = numSignerAccounts - numReadonlySignerAccounts;
    const readonlyNonSignerStart = staticKeys.length - numReadonlyNonSignerAccounts;

    return staticKeys.map((address, i) => {
        const signer = i < numSignerAccounts;
        const readonlySigned = signer && i >= readonlySignerStart;
        const readonlyNonSigned = !signer && i >= readonlyNonSignerStart;

        return { address, signer, source: 'static' as const, writable: !readonlySigned && !readonlyNonSigned };
    });
}

/**
 * Maps each loaded address position to the table that supplied it.
 *
 * The lookup entries are ordered, and their writable and readonly index counts line up one-to-one with
 * the flattened `loadedAddresses` arrays.
 */
function buildLookupTableMap(addressTableLookups: readonly AddressTableLookup[] | undefined): {
    readonlyMap: Address[];
    writableMap: Address[];
} {
    const readonlyMap: Address[] = [];
    const writableMap: Address[] = [];

    for (const lookup of addressTableLookups ?? []) {
        for (let i = 0; i < lookup.writableIndexes.length; i++) writableMap.push(lookup.accountKey);
        for (let i = 0; i < lookup.readonlyIndexes.length; i++) readonlyMap.push(lookup.accountKey);
    }

    return { readonlyMap, writableMap };
}

function toLoadedAccount(
    address: Address,
    lookupTableAddress: Address | undefined,
    writable: boolean,
): TransactionAccount {
    return {
        address,
        signer: false,
        source: 'lookupTable',
        writable,
        ...(lookupTableAddress !== undefined && { lookupTableAddress }),
    };
}
