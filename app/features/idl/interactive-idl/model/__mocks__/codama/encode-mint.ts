import { address, getAddressEncoder } from '@solana/kit';

/** Byte length of an SPL Token mint account. */
const MINT_SIZE = 82;

const MINT_AUTHORITY_OFFSET = 4;
const SUPPLY_OFFSET = 36;
const DECIMALS_OFFSET = 44;
const IS_INITIALIZED_OFFSET = 45;
const FREEZE_AUTHORITY_TAG_OFFSET = 46;

/**
 * Encodes an SPL Token mint account body by hand.
 * The display layer decodes injected account fields through the IDL's own `accountLink`, so a mint
 * built here exercises the real decode path with no RPC. `@codama/dynamic-codecs` would be the
 * natural encoder but it is only a transitive dependency, so pnpm does not expose it here.
 */
export function encodeMint({
    decimals,
    mintAuthority,
    supply = 1_000_000_000n,
}: {
    decimals: number;
    mintAuthority: string;
    supply?: bigint;
}): Uint8Array {
    const bytes = new Uint8Array(MINT_SIZE);
    const view = new DataView(bytes.buffer);

    view.setUint32(0, 1, true);
    bytes.set(getAddressEncoder().encode(address(mintAuthority)), MINT_AUTHORITY_OFFSET);
    view.setBigUint64(SUPPLY_OFFSET, supply, true);
    bytes[DECIMALS_OFFSET] = decimals;
    bytes[IS_INITIALIZED_OFFSET] = 1;
    view.setUint32(FREEZE_AUTHORITY_TAG_OFFSET, 0, true);

    return bytes;
}
