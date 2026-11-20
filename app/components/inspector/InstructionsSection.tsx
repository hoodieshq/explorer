import { InstructionNodeCard } from '@components/instruction/InstructionNodeCard';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import {
    inspectorSurface,
    instructionDataOf,
    InstructionNodeCards,
    InstructionSurfaceProvider,
    toInstructionNode,
} from '@entities/instruction-card';
import {
    AddressLookupTableAccount,
    type CompiledInnerInstruction,
    TransactionMessage,
    type VersionedMessage,
} from '@solana/web3.js';
import { useMemo } from 'react';

import { resolveInnerInstructions } from '@/app/entities/transaction-data';
import { useAddressLookupTables } from '@/app/providers/accounts';
import { FetchStatus } from '@/app/providers/cache';
import { Logger } from '@/app/shared/lib/logger';

import { ErrorCard } from '../common/ErrorCard';
import { LoadingCard } from '../common/LoadingCard';

export function InstructionsSection({
    message,
    compiledInnerInstructions,
}: {
    message: VersionedMessage;
    compiledInnerInstructions?: CompiledInnerInstruction[];
}) {
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
        // web3.js deserializes a message whose header `decompile` rejects, so pasted input can fail here.
        try {
            const cpisByIndex = compiledInnerInstructions
                ? resolveInnerInstructions(
                      compiledInnerInstructions,
                      message.getAccountKeys({ addressLookupTableAccounts }),
                      message,
                  )
                : undefined;
            const nodes = TransactionMessage.decompile(message, { addressLookupTableAccounts }).instructions.map(
                (ix, index) =>
                    toInstructionNode({
                        children: cpisByIndex
                            ?.get(index)
                            ?.map((cpi, childIndex) => cpi && toInstructionNode({ childIndex, index, ix: cpi })),
                        index,
                        ix,
                    }),
            );
            return { nodes };
        } catch (cause) {
            Logger.warn('[inspector] Failed to decode instructions', { cause });
            return { error: cause instanceof Error ? cause.message : String(cause) };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `lookupTablesKey` replaces `lookupTables`, which is a new array every render
    }, [allLookupsResolved, compiledInnerInstructions, lookupTablesKey, message]);
    const nodes = decoded && 'nodes' in decoded ? decoded.nodes : undefined;
    const surface = useMemo(
        () => inspectorSurface({ Card: InstructionNodeCard, instructionData: instructionDataOf(nodes ?? []) }),
        [nodes],
    );

    if (failedLookupIndex >= 0) {
        return (
            <ErrorCard
                text={`Failed to fetch address lookup table: ${message.addressTableLookups[
                    failedLookupIndex
                ].accountKey.toString()}`}
            />
        );
    }

    if (!decoded) {
        return <LoadingCard />;
    }

    if ('error' in decoded) {
        return <ErrorCard text={`Failed to decode the instructions: ${decoded.error}`} />;
    }

    return (
        <CollapsibleSection id="instructions" title="Instructions" className="">
            <InstructionSurfaceProvider surface={surface}>
                <InstructionNodeCards nodes={decoded.nodes} />
            </InstructionSurfaceProvider>
        </CollapsibleSection>
    );
}
