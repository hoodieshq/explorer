import { gen } from '@__fixtures__/gen';
import { compileV0TransactionMessage } from '@__fixtures__/transaction-message';
import type { BlockData } from '@entities/block-data';
import { fromCompiledMessage } from '@explorer/parsers/transaction';
import { AccountRole, address, blockhash, lamports } from '@solana/kit';
import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@components/common/Address', () => ({
    Address: ({ address }: { address: string }) => <span>{address}</span>,
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
const BLOCKHASH = blockhash(gen.blockhash(11));

function buildBlock(): BlockData {
    const message = compileV0TransactionMessage(FEE_PAYER, {
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
    });

    return {
        blockTime: null,
        blockhash: BLOCKHASH,
        parentSlot: 0n,
        previousBlockhash: BLOCKHASH,
        rewards: [],
        transactions: [
            {
                index: 0,
                meta: { err: null, fee: lamports(5_000n), logMessages: [] },
                parsedTransaction: fromCompiledMessage(message, {
                    loadedAddresses: { readonly: [LOADED_READONLY], writable: [] },
                }),
            },
        ],
    };
}

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
    it('should count each account as read-write or read-only by its role in the message', () => {
        const { container } = render(<BlockAccountsCard block={buildBlock()} blockSlot={123} />);

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
