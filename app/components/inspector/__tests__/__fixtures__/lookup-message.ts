import { gen } from '@__fixtures__/gen';
import { AddressLookupTableAccount, MessageV0, PublicKey } from '@solana/web3.js';

export const TABLE_KEY = gen.publicKey(1);

export function lookupTable(): AddressLookupTableAccount {
    return new AddressLookupTableAccount({
        key: TABLE_KEY,
        state: {
            addresses: [gen.publicKey(2)],
            authority: undefined,
            deactivationSlot: BigInt('18446744073709551615'),
            lastExtendedSlot: 372_654_321,
            lastExtendedSlotStartIndex: 0,
        },
    });
}

// A one-instruction Memo message whose second account comes from the lookup table.
export function buildLookupMessage(): MessageV0 {
    return new MessageV0({
        addressTableLookups: [{ accountKey: TABLE_KEY, readonlyIndexes: [], writableIndexes: [0] }],
        compiledInstructions: [{ accountKeyIndexes: [0, 2], data: new Uint8Array([104, 105]), programIdIndex: 1 }],
        header: { numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 1, numRequiredSignatures: 1 },
        recentBlockhash: gen.blockhash(),
        staticAccountKeys: [gen.publicKey(3), new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')],
    });
}
