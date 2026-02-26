import { PublicKey } from '@solana/web3.js';
import { NextResponse } from 'next/server';

import Logger from '@/app/utils/logger';
import { CACHE_HEADERS, NO_STORE_HEADERS, CACHE_MAX_AGE } from '../../config';

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
            next: { revalidate: CACHE_MAX_AGE },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch jupiter data' },
                { headers: NO_STORE_HEADERS, status: response.status }
            );
        }

        const data = await response.json();
        const token = Array.isArray(data) ? data.find((t: { id?: string }) => t.id === mintAddress) : null;
        return NextResponse.json({ verified: token?.isVerified === true }, { headers: CACHE_HEADERS });
    } catch (error) {
        Logger.error('Jupiter API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch jupiter data' },
            { headers: NO_STORE_HEADERS, status: 500 }
        );
    }
}
