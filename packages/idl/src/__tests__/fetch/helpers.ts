// Shared mocked-transport pieces for the fetch-route specs: real account bytes, faked rpc.
import { deflateSync } from 'node:zlib';

import {
    type Address,
    createAddressWithSeed,
    type GetAccountInfoApi,
    getProgramDerivedAddress,
    type Rpc,
} from '@solana/kit';

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the mocked rpc covers exactly the GetAccountInfoApi surface the fetch legs call */
export function mockRpc(accounts: Record<string, Uint8Array>): Rpc<GetAccountInfoApi> {
    return {
        getAccountInfo: (accountAddress: string) => ({
            send: async () => ({
                context: { slot: 0n },
                value: accounts[accountAddress]
                    ? {
                          data: [Buffer.from(accounts[accountAddress]).toString('base64'), 'base64'],
                          executable: false,
                          lamports: 1n,
                          owner: '11111111111111111111111111111111',
                          rentEpoch: 0n,
                          space: BigInt(accounts[accountAddress].length),
                      }
                    : null,
            }),
        }),
    } as unknown as Rpc<GetAccountInfoApi>;
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */

/** The on-chain anchor IDL account: 8-byte discriminator + authority + u32 length + deflated JSON. */
export function anchorIdlAccount(idl: object): Uint8Array {
    const deflated = deflateSync(Buffer.from(JSON.stringify(idl)));
    const data = Buffer.alloc(44 + deflated.length);
    data.writeUInt32LE(deflated.length, 40);
    deflated.copy(data, 44);
    return Uint8Array.from(data);
}

export async function anchorIdlAddress(program: Address): Promise<Address> {
    const [baseAddress] = await getProgramDerivedAddress({ programAddress: program, seeds: [] });
    return createAddressWithSeed({ baseAddress, programAddress: program, seed: 'anchor:idl' });
}
