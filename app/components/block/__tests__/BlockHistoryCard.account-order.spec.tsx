import { gen } from '@__fixtures__/gen';
import type { BlockWithV1 } from '@entities/block-data';
import { fromCompiledMessage } from '@explorer/parsers/transaction';
import {
    AccountRole,
    address,
    appendTransactionMessageInstruction,
    blockhash,
    compileTransactionMessage,
    createTransactionMessage,
    getCompiledTransactionMessageEncoder,
    pipe,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import { MessageV0, PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: () => '/block/123',
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@providers/cluster', () => ({
    useCluster: () => ({ cluster: 0 }),
}));

vi.mock('@components/common/Address', () => ({
    Address: ({ pubkey }: { pubkey: { toBase58(): string } }) => <span>{pubkey.toBase58()}</span>,
}));

vi.mock('@components/common/Signature', () => ({
    Signature: ({ signature }: { signature: string }) => <span>{signature}</span>,
}));

vi.mock('@components/common/SolBalance', () => ({
    SolBalance: ({ lamports }: { lamports: number }) => <span>{lamports}</span>,
}));

vi.mock('@utils/program-logs', () => ({
    parseProgramLogs: () => [{ computeUnits: 0, truncated: false }],
}));

import { BlockHistoryCard } from '../BlockHistoryCard';

const FEE_PAYER = address(gen.address(1));
const OUTER_PROGRAM = address(gen.address(2));
const LOOKUP_TABLE_ADDRESS = address(gen.address(3));
const WRITABLE_LOADED = address(gen.address(4));
const READONLY_LOADED = address(gen.address(5));
const LIFETIME = { blockhash: blockhash(gen.blockhash(9)), lastValidBlockHeight: 100n };

// A v0 message whose one instruction loads a writable and a readonly address from the same lookup
// table, so the compiled account list carries all three segments: static, loaded writable, loaded
// readonly.
function buildV0Message() {
    return compileTransactionMessage(
        pipe(
            createTransactionMessage({ version: 0 }),
            m => setTransactionMessageFeePayer(FEE_PAYER, m),
            m => setTransactionMessageLifetimeUsingBlockhash(LIFETIME, m),
            m =>
                appendTransactionMessageInstruction(
                    {
                        accounts: [
                            {
                                address: WRITABLE_LOADED,
                                addressIndex: 0,
                                lookupTableAddress: LOOKUP_TABLE_ADDRESS,
                                role: AccountRole.WRITABLE,
                            },
                            {
                                address: READONLY_LOADED,
                                addressIndex: 0,
                                lookupTableAddress: LOOKUP_TABLE_ADDRESS,
                                role: AccountRole.READONLY,
                            },
                        ],
                        data: new Uint8Array([9]),
                        programAddress: OUTER_PROGRAM,
                    },
                    m,
                ),
        ),
    );
}

describe('BlockHistoryCard account order', () => {
    it('should resolve an inner instruction lookup-table address at the index web3.js resolves it to', () => {
        const compiled = buildV0Message();
        const messageBytes = new Uint8Array(getCompiledTransactionMessageEncoder().encode(compiled));

        // The pre-migration path: web3.js's own account-key resolution on the same wire bytes.
        const loadedAddresses = {
            readonly: [new PublicKey(READONLY_LOADED)],
            writable: [new PublicKey(WRITABLE_LOADED)],
        };
        const web3Keys = MessageV0.deserialize(messageBytes)
            .getAccountKeys({ accountKeysFromLookups: loadedAddresses })
            .keySegments()
            .flat()
            .map(key => key.toBase58());

        const parsedTransaction = fromCompiledMessage(compiled, {
            loadedAddresses: { readonly: [READONLY_LOADED], writable: [WRITABLE_LOADED] },
        });

        expect(parsedTransaction.accounts.map(account => account.address)).toEqual(web3Keys);

        const readonlyLoadedIndex = web3Keys.indexOf(READONLY_LOADED);
        // Past both the static and loaded-writable segments, so the proof covers the full layout.
        expect(readonlyLoadedIndex).toBeGreaterThan(1);
        expect(parsedTransaction.accounts[readonlyLoadedIndex]?.address).toBe(READONLY_LOADED);

        const block = {
            transactions: [
                {
                    meta: {
                        costUnits: 1,
                        err: null,
                        fee: 5_000,
                        innerInstructions: [
                            {
                                index: 0,
                                instructions: [{ accounts: [], data: '', programIdIndex: readonlyLoadedIndex }],
                            },
                        ],
                        loadedAddresses: undefined,
                        logMessages: [],
                    },
                    parsedTransaction,
                    transaction: { signatures: [gen.signature(1)] },
                    version: 0,
                },
            ],
        } as unknown as BlockWithV1;

        render(<BlockHistoryCard block={block} epoch={500n} />);

        // The outer instruction's own program and the inner instruction's lookup-table-loaded program
        // both resolve to their addresses and render in the invoked-programs list. Mobile and desktop
        // layouts render together in jsdom, so each address appears twice.
        expect(screen.getAllByText(OUTER_PROGRAM)).toHaveLength(2);
        expect(screen.getAllByText(READONLY_LOADED)).toHaveLength(2);
    });
});
