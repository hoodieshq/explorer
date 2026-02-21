import { Connection, PublicKey } from '@solana/web3.js';
import { SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS as SAS_PROGRAM_ID } from 'sas-lib';
import { Cluster, serverClusterUrl } from '@utils/cluster';
import { NextResponse } from 'next/server';

const BLUPRYNT_CREDENTIAL = process.env.NEXT_PUBLIC_BLUPRYNT_CREDENTIAL_AUTHORITY;

// Cache for 4 hours, allow stale for 1 hour while revalidating
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=14400, stale-while-revalidate=3600' };

type Params = {
    params: {
        mintAddress: string;
    };
};

export async function GET(_request: Request, { params: { mintAddress } }: Params) {
    if (!mintAddress) {
        return NextResponse.json({ error: 'Missing mint address' }, { status: 400 });
    }

    if (!BLUPRYNT_CREDENTIAL) {
        return NextResponse.json({ verified: false }, { headers: CACHE_HEADERS });
    }

    try {
        const connection = new Connection(serverClusterUrl(Cluster.MainnetBeta, ''), 'confirmed');

        // Attestation layout (1-byte discriminator):
        // - 1 byte discriminator (offset 0)
        // - 32 bytes nonce/mint address (offset 1)
        // - 32 bytes credential pubkey (offset 33)
        // - 32 bytes schema pubkey (offset 65)
        const accounts = await connection.getProgramAccounts(new PublicKey(SAS_PROGRAM_ID), {
            filters: [
                { memcmp: { bytes: BLUPRYNT_CREDENTIAL, offset: 33 } },
                { memcmp: { bytes: mintAddress, offset: 1 } },
            ],
            dataSlice: { offset: 0, length: 0 },
        });

        const verified = accounts.length > 0;

        return NextResponse.json({ verified }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Bluprynt verification error:', error);
        return NextResponse.json({ verified: false }, { headers: { 'Cache-Control': 'no-store' } });
    }
}
