import { PublicKey, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { render, screen, within } from '@testing-library/react';
import type { AddressLookupTableAccountInfo } from '@validators/accounts/address-lookup-table';
import { describe, expect, it, vi } from 'vitest';

import { LookupTableEntriesCard } from '../LookupTableEntriesCard';

// `Address` reaches for the active cluster, which has no provider here; a stub printing the base58 keeps
// the spec on the index/address rows.
vi.mock('@components/common/Address', () => ({
    Address: ({ pubkey }: { pubkey: { toBase58(): string } }) => <span>{pubkey.toBase58()}</span>,
}));

const ADDRESSES = [PublicKey.default, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY];

describe('LookupTableEntriesCard', () => {
    it('should list parsed entries with their index under the section heading', () => {
        render(<LookupTableEntriesCard parsedLookupTable={parsedTable(ADDRESSES)} />);

        expect(screen.getByRole('heading', { name: 'Lookup Table Entries' })).toBeInTheDocument();
        expect(bodyRows()).toEqual(ADDRESSES.map((key, index) => [String(index), key.toBase58()]));
    });

    it('should decode entries from raw account bytes', () => {
        render(<LookupTableEntriesCard lookupTableAccountData={rawTable(ADDRESSES)} />);

        expect(bodyRows()).toEqual(ADDRESSES.map((key, index) => [String(index), key.toBase58()]));
    });

    it('should keep a repeated address as separate entries', () => {
        render(<LookupTableEntriesCard parsedLookupTable={parsedTable([SYSVAR_RENT_PUBKEY, SYSVAR_RENT_PUBKEY])} />);

        expect(bodyRows()).toEqual([
            ['0', SYSVAR_RENT_PUBKEY.toBase58()],
            ['1', SYSVAR_RENT_PUBKEY.toBase58()],
        ]);
    });

    it('should show one full-width "No entries found" row for an empty parsed table', () => {
        render(<LookupTableEntriesCard parsedLookupTable={parsedTable([])} />);

        expect(bodyRows()).toEqual([['No entries found']]);
        expect(screen.getByRole('cell', { name: 'No entries found' })).toHaveClass('col-span-full');
    });

    it('should show "No entries found" for raw bytes that hold no addresses', () => {
        render(<LookupTableEntriesCard lookupTableAccountData={rawTable([])} />);

        expect(bodyRows()).toEqual([['No entries found']]);
    });
});

const U64_MAX = BigInt('18446744073709551615');

function parsedTable(addresses: PublicKey[]): AddressLookupTableAccountInfo {
    return {
        addresses,
        deactivationSlot: U64_MAX,
        lastExtendedSlot: 312_000_000,
        lastExtendedSlotStartIndex: 0,
    };
}

// The layout `AddressLookupTableAccount.deserialize` reads: a 56-byte header (u32 type index 1, u64
// deactivation slot, u64 last extended slot, u8 start index, optional authority, padding), then 32 bytes per address.
function rawTable(addresses: PublicKey[]): Uint8Array {
    const META_SIZE = 56;
    const data = new Uint8Array(META_SIZE + addresses.length * 32);
    const view = new DataView(data.buffer);
    view.setUint32(0, 1, true);
    view.setBigUint64(4, U64_MAX, true);
    addresses.forEach((key, i) => data.set(key.toBytes(), META_SIZE + i * 32));
    return data;
}

// Text of each body row's cells, skipping the column header row.
function bodyRows(): string[][] {
    const table = screen.getByRole('table', { name: 'Lookup table entries' });
    return within(table)
        .getAllByRole('row')
        .slice(1)
        .map(row =>
            within(row)
                .getAllByRole('cell')
                .map(cell => cell.textContent ?? ''),
        );
}
