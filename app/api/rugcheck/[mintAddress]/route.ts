import { PublicKey } from '@solana/web3.js';
import Logger from '@/app/utils/logger';
import { NextResponse } from 'next/server';

const RUGCHECK_API_KEY = process.env.RUGCHECK_API_KEY;

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
        const requestHeaders: HeadersInit = RUGCHECK_API_KEY ? { 'x-api-key': RUGCHECK_API_KEY } : {};
        const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`, {
            headers: requestHeaders,
            next: { revalidate: CACHE_MAX_AGE },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch rugcheck data' },
                { headers: CACHE_HEADERS, status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ score: data.score_normalised }, { headers: CACHE_HEADERS });
    } catch (error) {
        Logger.error('Rugcheck API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rugcheck data' },
            { headers: { 'Cache-Control': 'no-store, max-age=0' }, status: 500 }
        );
    }
}
