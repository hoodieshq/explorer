import { DEFAULT_SLOT, gen } from '@__fixtures__/gen';
import { PublicKey, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import type { AddressLookupTableAccountInfo } from '@validators/accounts/address-lookup-table';

// An entry is referenced by a u8 index, so a table holds at most 256 addresses.
export const MAX_ENTRIES = 256;

// Known programs render as labels; the generated keys render as raw addresses, which mid-truncate on phones.
const MIXED_ADDRESSES = [
    new PublicKey(TOKEN_PROGRAM_ADDRESS),
    SYSVAR_CLOCK_PUBKEY,
    ...Array.from({ length: 6 }, (_, i) => gen.publicKey(i)),
];

export function lookupTableFixture(addresses: PublicKey[] = MIXED_ADDRESSES): {
    parsedLookupTable: AddressLookupTableAccountInfo;
} {
    return {
        parsedLookupTable: {
            addresses,
            deactivationSlot: BigInt('18446744073709551615'),
            lastExtendedSlot: DEFAULT_SLOT,
            lastExtendedSlotStartIndex: 0,
        },
    };
}

export const maxEntriesAddresses = () => Array.from({ length: MAX_ENTRIES }, (_, i) => gen.publicKey(i));
