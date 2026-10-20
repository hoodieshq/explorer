import type { KitInstruction } from '@explorer/parsers';
import { toKitInstruction } from '@explorer/parsers/compat';
import {
    AddressLookupTableAccount,
    type CompiledInnerInstruction,
    type TransactionInstruction,
    TransactionMessage,
    type VersionedMessage,
} from '@solana/web3.js';
import { useMemo } from 'react';

import { resolveInnerInstructions } from '@/app/entities/transaction-data';
import { useAddressLookupTables } from '@/app/providers/accounts';
import { FetchStatus } from '@/app/providers/cache';

export type DecodedMessage = {
    instructions: TransactionInstruction[];
    innerIxByIndex: Map<number, (TransactionInstruction | undefined)[]> | undefined;
    kitInstructions: KitInstruction[];
    kitInnerIxByIndex: Map<number, (KitInstruction | undefined)[]>;
};

export type DecodedMessageResult =
    | { status: 'loading' }
    | { status: 'failed'; failedLookupIndex: number }
    | { status: 'ready'; decoded: DecodedMessage };

/** Resolves the lookup tables of a message and decompiles its top-level and inner instructions. */
export function useDecodedMessage(
    message: VersionedMessage,
    compiledInnerInstructions?: CompiledInnerInstruction[],
): DecodedMessageResult {
    const hydratedTables = useAddressLookupTables(
        message.addressTableLookups.map(lookup => lookup.accountKey.toString()),
    );

    const failedLookupIndex = hydratedTables.findIndex(table => table?.[1] === FetchStatus.FetchFailed);
    const lookupTables = hydratedTables.flatMap(table =>
        table?.[0] instanceof AddressLookupTableAccount ? [table[0]] : [],
    );
    const allLookupsResolved = lookupTables.length === hydratedTables.length;

    // `useAddressLookupTables` returns a new array on each render, so the memo below depends on
    // `lookupTablesKey` instead of `lookupTables`.
    // A table only gains addresses, so `lastExtendedSlot` and the address count identify its contents.
    const lookupTablesKey = lookupTables
        .map(table => `${table.key.toBase58()}:${table.state.lastExtendedSlot}:${table.state.addresses.length}`)
        .join('|');

    const decoded = useMemo(() => {
        if (!allLookupsResolved) return undefined;
        const addressLookupTableAccounts = lookupTables;
        const innerIxByIndex = compiledInnerInstructions
            ? resolveInnerInstructions(
                  compiledInnerInstructions,
                  message.getAccountKeys({ addressLookupTableAccounts }),
                  message,
              )
            : undefined;
        const instructions = TransactionMessage.decompile(message, { addressLookupTableAccounts }).instructions;
        return {
            innerIxByIndex,
            instructions,
            // Stable references, so the eager parse in each card provider runs once per decoded message
            kitInnerIxByIndex: new Map(
                [...(innerIxByIndex ?? [])].map(([index, group]) => [
                    index,
                    group.map(ix => ix && toKitInstruction(ix)),
                ]),
            ),
            kitInstructions: instructions.map(ix => toKitInstruction(ix)),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `lookupTablesKey` replaces `lookupTables`, which is a new array every render
    }, [allLookupsResolved, compiledInnerInstructions, lookupTablesKey, message]);

    return useMemo((): DecodedMessageResult => {
        if (failedLookupIndex >= 0) return { failedLookupIndex, status: 'failed' };
        if (!decoded) return { status: 'loading' };
        return { decoded, status: 'ready' };
    }, [decoded, failedLookupIndex]);
}
