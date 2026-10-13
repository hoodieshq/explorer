import { type Address, none } from '@solana/kit';
import { getAddressLookupTableEncoder } from '@solana-program/address-lookup-table';

import { toBase64 } from '@/app/shared/lib/bytes';

/**
 * Address Lookup Table account data for tests that decode ALT state from raw account bytes.
 * The constants are real tables captured from Solana mainnet.
 */

/** Addresses: 3zK38YBP6u3BpLUpaa6QhRHh4VXdv3J8cmD24fFpuyqy, SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf, BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY */
export const ALT_3_ADDRS =
    'AQAAAP//////////gCtDFAAAAABLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsZd/I1FvQKS++AWuQKFqovsXPlNsSwyHSVfjJIqctyAaBxM5H4iNouLFVXsiHrwku/H77tmyj9S+/aNSsnLeomIuA63k1KGmyJHRfWd2/iiZYyhPcaIEhJjUcrgfBpaU=';

/** Addresses: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v */
export const ALT_2_ADDRS =
    'AQAAAP//////////gCtDFAAAAABLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8Aqcb6evO+2606PWXzaqvJdDGxu+TC0vbg5HymAgNFL11h';

export const ALT_3_EXPECTED_ADDRESSES = [
    '3zK38YBP6u3BpLUpaa6QhRHh4VXdv3J8cmD24fFpuyqy',
    'SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf',
    'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY',
];

export const ALT_2_EXPECTED_ADDRESSES = [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
];

const ADDRESS_LOOKUP_TABLE_PROGRAM = 'AddressLookupTab1e1111111111111111111111111';

/** Base64 account data of an active lookup table holding `addresses`. */
export function encodeLookupTableData(addresses: Address[]): string {
    const data = getAddressLookupTableEncoder().encode({
        addresses,
        authority: none(),
        deactivationSlot: 18_446_744_073_709_551_615n,
        lastExtendedSlot: 0,
        lastExtendedSlotStartIndex: 0,
    });

    return toBase64(new Uint8Array(data));
}

/** A lookup table account in the base64 shape `getMultipleAccounts` returns it. */
export function lookupTableAccountInfo(base64Data: string) {
    return {
        data: [base64Data, 'base64'] as const,
        executable: false,
        lamports: 1_000_000n,
        owner: ADDRESS_LOOKUP_TABLE_PROGRAM,
        rentEpoch: 0n,
        space: 0n,
    };
}
