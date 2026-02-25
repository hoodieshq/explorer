import { NextResponse } from 'next/server';

const RUGCHECK_API_KEY = process.env.NEXT_PUBLIC_RUGCHECK_API_KEY;

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

    try {
        const requestHeaders: HeadersInit = RUGCHECK_API_KEY ? { 'x-api-key': RUGCHECK_API_KEY } : {};
        const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`, {
            headers: requestHeaders,
            next: { revalidate: 60 },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch rugcheck data' }, { headers: CACHE_HEADERS, status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ score: data.score_normalised }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Rugcheck API error:', error);
        return NextResponse.json({ error: 'Failed to fetch rugcheck data' }, { headers: { 'Cache-Control': 'no-store, max-age=0' }, status: 500 });
    }
}
