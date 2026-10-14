import type { SolanaRpc } from '@entities/cluster/@x/transaction-data';
import type { Address } from '@solana/kit';
import { fetchAllMaybeAddressLookupTable } from '@solana-program/address-lookup-table';

type CompiledAddressTableLookup = {
    lookupTableAddress: Address;
    readonlyIndexes: readonly number[];
    writableIndexes: readonly number[];
};

export type LoadedAddresses = { readonly: Address[]; writable: Address[] };

/**
 * Fetch the lookup tables a v0 message references and return the addresses it loads from them.
 * Each list joins the tables in message order, which is the order Solana appends them after the static keys.
 *
 * Throws when a table cannot be loaded or has no address at an index the message reads.
 * A partial result would shift every later account.
 */
export async function resolveAddressLookupTables(
    rpc: SolanaRpc,
    lookups: readonly CompiledAddressTableLookup[],
): Promise<LoadedAddresses> {
    const loaded: LoadedAddresses = { readonly: [], writable: [] };
    if (lookups.length === 0) return loaded;

    const accounts = await fetchAllMaybeAddressLookupTable(
        rpc,
        lookups.map(lookup => lookup.lookupTableAddress),
        { commitment: 'confirmed' },
    );

    accounts.forEach((account, i) => {
        const { lookupTableAddress, readonlyIndexes, writableIndexes } = lookups[i];
        if (!account.exists) {
            throw new Error(
                `Address lookup table ${lookupTableAddress} could not be loaded: the RPC returned no account ` +
                    `for it. The table may have been closed, or this RPC may not carry it.`,
            );
        }

        const { addresses } = account.data;
        const addressAt = (index: number): Address => {
            const loadedAddress = addresses[index];
            if (loadedAddress === undefined) {
                throw new Error(
                    `Address lookup table ${lookupTableAddress} has no address at index ${index}: ` +
                        `it holds ${addresses.length}.`,
                );
            }
            return loadedAddress;
        };

        loaded.writable.push(...writableIndexes.map(addressAt));
        loaded.readonly.push(...readonlyIndexes.map(addressAt));
    });

    return loaded;
}
