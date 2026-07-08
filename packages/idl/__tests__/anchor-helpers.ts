// Shared Anchor drivers for the __tests__ suites — real workspace-program IDLs on the encode side.
import type { AnchorIdl } from '@explorer/idl';
import { Program, type Provider } from '@coral-xyz/anchor';
import { deflateSync } from 'node:zlib';

import { loadSimple031Idl, u64le } from '../src/__tests__/fixtures';

// Stand-in for fetched account bytes — assembled from the program's own declared discriminator.
export function counterAccountData(idl: AnchorIdl): Uint8Array {
    // the IDL JSON keeps the Rust name ("Counter"); only the generated TS type camelCases it
    const counter = (idl.accounts ?? []).find(item => item.name.toLowerCase() === 'counter');
    if (!counter) throw new Error('generated program must declare the counter account');
    return new Uint8Array([...counter.discriminator, ...new Uint8Array(32), ...u64le(7n)]);
}

/** The on-chain anchor IDL account: 8-byte discriminator + authority pubkey + vecU8 of zlib-deflated JSON. */
function idlAccountInfo(idl: AnchorIdl): { data: Buffer } {
    const deflated = deflateSync(Buffer.from(JSON.stringify(idl)));
    const length = Buffer.alloc(4);
    length.writeUInt32LE(deflated.length, 0);
    return { data: Buffer.concat([Buffer.alloc(8), Buffer.alloc(32), length, deflated]) };
}

// simple-031's IDL arrives through anchor's client: Program.fetchIdl over a mocked connection (no HTTP).
// The optional generic is anchor's own `Program.fetchIdl<T>` — pass a companion type to flow inference,
// omit it for the wide runtime shape (Anchor IDL JSON embeds no TS type of its own).
export async function fetchSimple031Idl<T extends AnchorIdl = AnchorIdl>(): Promise<T> {
    const raw = loadSimple031Idl();
    const provider = {
        connection: { getAccountInfo: async () => idlAccountInfo(raw) },
    } as unknown as Provider;
    const fetched = await Program.fetchIdl<T>(raw.address, provider);
    if (!fetched) throw new Error('mocked IDL account must resolve');
    return fetched;
}
