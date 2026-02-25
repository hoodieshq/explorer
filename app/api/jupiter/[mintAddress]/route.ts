import { PublicKey } from '@solana/web3.js';
import { NextResponse } from 'next/server';

import Logger from '@/app/utils/logger';

const JUPITER_API_KEY = process.env.JUPITER_API_KEY;

const CACHE_MAX_AGE = 14400;
const CACHE_HEADERS = { 'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=3600` };

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

    try {
        const requestHeaders: HeadersInit = JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {};
        const response = await fetch(`https://api.jup.ag/tokens/v2/search?query=${mintAddress}`, {
            headers: requestHeaders,
            next: { revalidate: CACHE_MAX_AGE },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch jupiter data' },
                { headers: CACHE_HEADERS, status: response.status }
            );
        }

        const data = await response.json();
        const token = Array.isArray(data) ? data.find((t: { id?: string }) => t.id === mintAddress) : null;
        return NextResponse.json({ verified: token?.isVerified === true }, { headers: CACHE_HEADERS });
    } catch (error) {
        Logger.error('Jupiter API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch jupiter data' },
            { headers: { 'Cache-Control': 'no-store, max-age=0' }, status: 500 }
        );
    }
}
