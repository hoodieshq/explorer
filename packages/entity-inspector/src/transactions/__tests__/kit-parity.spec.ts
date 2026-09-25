import {
    type AccountLookupMeta,
    type AccountMeta,
    type CompiledTransactionMessageWithLifetime,
    decompileTransactionMessage,
    isSignerRole,
    isWritableRole,
    type LegacyCompiledTransactionMessage,
    type TransactionVersion as KitTransactionVersion,
    type V0CompiledTransactionMessage,
} from '@solana/kit';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { InspectorLogger } from '../../logger.js';
import { testAddress } from '../../__tests__/gen.js';
import type { ResolvedAccount, TransactionPayloadContext } from '../types.js';
import { normalizeTransactionProbe } from '../normalizer.js';

const INSTRUCTION_DATA = '3Bxs';

function logger(): InspectorLogger {
    return { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
}

function toResolvedAccount(meta: AccountLookupMeta | AccountMeta): ResolvedAccount {
    return {
        address: meta.address,
        signer: isSignerRole(meta.role),
        writable: isWritableRole(meta.role),
        ...('lookupTableAddress' in meta
            ? { lookupTableAddress: meta.lookupTableAddress, source: 'lookupTable' }
            : { source: 'static' }),
    };
}

function instructionAccounts(message: {
    instructions: readonly { accounts?: readonly (AccountLookupMeta | AccountMeta)[] }[];
}): readonly (AccountLookupMeta | AccountMeta)[] {
    return message.instructions[0].accounts ?? [];
}

function normalize(envelope: Record<string, unknown>): TransactionPayloadContext {
    const context = normalizeTransactionProbe('sig', envelope as never, null, logger());
    if (context === null) {
        throw new Error('expected a normalized transaction context');
    }
    return context;
}

// The normalizer resolves accounts through @explorer/parsers/transaction, which mirrors kit's
// account-meta ordering because kit keeps it internal (getAccountMetas and getAddressLookupMetas are
// not exported). These suites derive their expectations from kit's public decompileTransactionMessage
// instead, an independent oracle that a wrong resolver refactor cannot co-update.
//
// The v0 json envelope flattens loaded addresses writable-first across lookups, in lookup order.
describe('legacy account resolution against kit decompileTransactionMessage', () => {
    it('should classify static keys exactly as kit derives roles from the compiled header', () => {
        const staticAccounts = [testAddress(1), testAddress(2), testAddress(3), testAddress(4)];
        const lifetimeToken = testAddress(9);
        const compiled: CompiledTransactionMessageWithLifetime & LegacyCompiledTransactionMessage = {
            header: { numReadonlyNonSignerAccounts: 1, numReadonlySignerAccounts: 1, numSignerAccounts: 2 },
            instructions: [{ accountIndices: [0, 1, 2, 3], programAddressIndex: 3 }],
            lifetimeToken,
            staticAccounts,
            version: 'legacy',
        };

        const kitAccounts = instructionAccounts(decompileTransactionMessage(compiled));
        const context = normalize({
            blockTime: null,
            meta: null,
            slot: 1,
            transaction: {
                message: {
                    accountKeys: staticAccounts,
                    header: {
                        numReadonlySignedAccounts: 1,
                        numReadonlyUnsignedAccounts: 1,
                        numRequiredSignatures: 2,
                    },
                    instructions: [{ accounts: [0, 1, 2, 3], data: INSTRUCTION_DATA, programIdIndex: 3 }],
                    recentBlockhash: lifetimeToken,
                },
            },
            version: 'legacy',
        });

        expect(kitAccounts).toHaveLength(staticAccounts.length);
        expect(context.accountKeys).toEqual(kitAccounts.map(meta => meta.address));
        expect(context.resolvedAccounts).toEqual(kitAccounts.map(toResolvedAccount));
    });
});

describe('v0 account resolution against kit decompileTransactionMessage', () => {
    it('should order and attribute v0 lookup table addresses exactly as kit decompiles them', () => {
        const staticAccounts = [testAddress(1), testAddress(2), testAddress(3)];
        const lifetimeToken = testAddress(9);
        const lookupTableA = testAddress(10);
        const lookupTableB = testAddress(11);
        const tableAContents = [testAddress(21), testAddress(22), testAddress(23)];
        const tableBContents = [testAddress(31), testAddress(32), testAddress(33)];
        const compiled: CompiledTransactionMessageWithLifetime & V0CompiledTransactionMessage = {
            addressTableLookups: [
                { lookupTableAddress: lookupTableA, readonlyIndexes: [1], writableIndexes: [0, 2] },
                { lookupTableAddress: lookupTableB, readonlyIndexes: [0, 2], writableIndexes: [1] },
            ],
            header: { numReadonlyNonSignerAccounts: 1, numReadonlySignerAccounts: 0, numSignerAccounts: 1 },
            instructions: [{ accountIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8], programAddressIndex: 2 }],
            lifetimeToken,
            staticAccounts,
            version: 0,
        };

        const kitAccounts = instructionAccounts(
            decompileTransactionMessage(compiled, {
                addressesByLookupTableAddress: {
                    [lookupTableA]: tableAContents,
                    [lookupTableB]: tableBContents,
                },
            }),
        );
        const context = normalize({
            blockTime: null,
            meta: {
                err: null,
                fee: 0,
                loadedAddresses: {
                    readonly: [tableAContents[1], tableBContents[0], tableBContents[2]],
                    writable: [tableAContents[0], tableAContents[2], tableBContents[1]],
                },
            },
            slot: 1,
            transaction: {
                message: {
                    accountKeys: staticAccounts,
                    addressTableLookups: [
                        { accountKey: lookupTableA, readonlyIndexes: [1], writableIndexes: [0, 2] },
                        { accountKey: lookupTableB, readonlyIndexes: [0, 2], writableIndexes: [1] },
                    ],
                    header: {
                        numReadonlySignedAccounts: 0,
                        numReadonlyUnsignedAccounts: 1,
                        numRequiredSignatures: 1,
                    },
                    instructions: [
                        { accounts: [0, 1, 2, 3, 4, 5, 6, 7, 8], data: INSTRUCTION_DATA, programIdIndex: 2 },
                    ],
                    recentBlockhash: lifetimeToken,
                },
            },
            version: 0,
        });

        expect(kitAccounts).toHaveLength(9);
        expect(context.accountKeys).toEqual(kitAccounts.map(meta => meta.address));
        expect(context.resolvedAccounts).toEqual(kitAccounts.map(toResolvedAccount));
    });
});

// Fails when kit widens its version union. Re-decide the normalizer's rejection then.
describe('transaction version vocabulary pinned to kit', () => {
    it('should report only versions kit recognizes', () => {
        expectTypeOf<Exclude<TransactionPayloadContext['version'], null>>().toExtend<KitTransactionVersion>();
    });

    it('should pin the kit version vocabulary to legacy, 0 and 1', () => {
        expectTypeOf<KitTransactionVersion>().toEqualTypeOf<'legacy' | 0 | 1>();
    });
});
