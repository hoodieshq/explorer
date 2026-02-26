import { PublicKey } from '@solana/web3.js';
import { NextResponse } from 'next/server';
import { array, boolean, is, optional, string, type } from 'superstruct';

import Logger from '@/app/utils/logger';

import { CACHE_HEADERS, NO_STORE_HEADERS } from '../../config';

const JupiterTokenSchema = type({
    id: string(),
    isVerified: optional(boolean()),
});

const JupiterResponseSchema = array(JupiterTokenSchema);

const JUPITER_API_KEY = process.env.JUPITER_API_KEY;

type Params = {
    params: {
        mintAddress: string;
    };
};

export async function GET(_request: Request, { params: { mintAddress } }: Params) {
    try {
        new PublicKey(mintAddress);
    } catch {
        return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
    }

    if (!JUPITER_API_KEY) {
        return NextResponse.json(
            { error: 'Jupiter API key is not configured' },
            { headers: NO_STORE_HEADERS, status: 500 }
        );
    }

    try {
        const response = await fetch(`https://api.jup.ag/tokens/v2/search?query=${mintAddress}`, {
            headers: { 'x-api-key': JUPITER_API_KEY },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch jupiter data' },
                { headers: NO_STORE_HEADERS, status: response.status }
            );
        }

        const data = await response.json();

        if (!is(data, JupiterResponseSchema)) {
            return NextResponse.json({ verified: false }, { headers: CACHE_HEADERS });
        }

        const token = data.find(t => t.id === mintAddress);
        return NextResponse.json({ verified: token?.isVerified === true }, { headers: CACHE_HEADERS });
    } catch (error) {
        Logger.error(new Error('Jupiter API error', { cause: error }));
        return NextResponse.json({ error: 'Failed to fetch jupiter data' }, { headers: NO_STORE_HEADERS, status: 500 });
    }
}
