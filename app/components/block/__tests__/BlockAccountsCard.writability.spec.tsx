import { gen } from '@__fixtures__/gen';
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
import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@components/common/Address', () => ({
    Address: ({ pubkey }: { pubkey: { toBase58(): string } }) => <span>{pubkey.toBase58()}</span>,
}));

vi.mock('@utils/url', () => ({
    useClusterPath: ({ pathname }: { pathname: string }) => pathname,
}));

import { BlockAccountsCard } from '../BlockAccountsCard';

const FEE_PAYER = address(gen.address(1));
const SECOND_SIGNER = address(gen.address(2));
const NON_SIGNER_WRITABLE = address(gen.address(3));
const NON_SIGNER_READONLY = address(gen.address(4));
const LOOKUP_TABLE_ADDRESS = address(gen.address(5));
const LOADED_READONLY = address(gen.address(6));
const PROGRAM = address(gen.address(7));
const LIFETIME = { blockhash: blockhash(gen.blockhash(11)), lastValidBlockHeight: 100n };

// One instruction naming every combination BlockAccountsCard must classify: a signer-writable, a
// signer-readonly, a non-signer-writable, a non-signer-readonly, and a lookup-table-loaded readonly.
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
                            { address: FEE_PAYER, role: AccountRole.WRITABLE_SIGNER },
                            { address: SECOND_SIGNER, role: AccountRole.READONLY_SIGNER },
                            { address: NON_SIGNER_WRITABLE, role: AccountRole.WRITABLE },
                            { address: NON_SIGNER_READONLY, role: AccountRole.READONLY },
                            {
                                address: LOADED_READONLY,
                                addressIndex: 0,
                                lookupTableAddress: LOOKUP_TABLE_ADDRESS,
                                role: AccountRole.READONLY,
                            },
                        ],
                        data: new Uint8Array([1]),
                        programAddress: PROGRAM,
                    },
                    m,
                ),
        ),
    );
}

// Walks from an occurrence of `text` up to the nearest ancestor whose own text includes both grid
// labels, which is the account's row (mobile carries the labels, desktop carries bare numbers).
function findRow(root: HTMLElement, text: string): HTMLElement {
    for (const el of within(root).getAllByText(text)) {
        let row: HTMLElement | null = el;
        while (row && !(row.textContent?.includes('Read-Write') && row.textContent?.includes('Read-Only'))) {
            // eslint-disable-next-line testing-library/no-node-access -- walking up to the row has no query
            row = row.parentElement;
        }
        if (row) return row;
    }
    throw new Error(`no row found for ${text}`);
}

function readCount(row: HTMLElement, label: string): string | null | undefined {
    return within(row).getByText(label).nextElementSibling?.textContent;
}

describe('BlockAccountsCard writability', () => {
    it('should classify writable and readonly accounts the same way web3.js does', () => {
        const compiled = buildV0Message();
        const messageBytes = new Uint8Array(getCompiledTransactionMessageEncoder().encode(compiled));
        const loadedAddresses = { readonly: [new PublicKey(LOADED_READONLY)], writable: [] };

        const web3Message = MessageV0.deserialize(messageBytes);
        const web3Keys = web3Message.getAccountKeys({ accountKeysFromLookups: loadedAddresses }).keySegments().flat();
        const web3Writable = web3Keys.map((_key, i) => web3Message.isAccountWritable(i));

        const parsedTransaction = fromCompiledMessage(compiled, {
            loadedAddresses: { readonly: [LOADED_READONLY], writable: [] },
        });

        expect(parsedTransaction.accounts.map(account => account.writable)).toEqual(web3Writable);

        const block = {
            transactions: [{ parsedTransaction }],
        } as unknown as Parameters<typeof BlockAccountsCard>[0]['block'];

        const { container } = render(<BlockAccountsCard block={block} blockSlot={123} />);

        const expected: [string, boolean][] = [
            [FEE_PAYER, true],
            [SECOND_SIGNER, false],
            [NON_SIGNER_WRITABLE, true],
            [NON_SIGNER_READONLY, false],
            [LOADED_READONLY, false],
        ];
        for (const [accountAddress, isWritable] of expected) {
            const row = findRow(container, accountAddress);
            expect(readCount(row, 'Read-Write')).toBe(isWritable ? '1' : '0');
            expect(readCount(row, 'Read-Only')).toBe(isWritable ? '0' : '1');
        }
    });
});
