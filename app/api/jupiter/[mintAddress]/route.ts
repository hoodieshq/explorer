import { NextResponse } from 'next/server';

const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY;

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
        const requestHeaders: HeadersInit = JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {};
        const response = await fetch(`https://api.jup.ag/tokens/v2/search?query=${mintAddress}`, {
            headers: requestHeaders,
            next: { revalidate: 60 },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch jupiter data' }, { status: response.status, headers: CACHE_HEADERS });
        }

        const data = await response.json();
        const token = Array.isArray(data) ? data.find((t: { id?: string }) => t.id === mintAddress) : null;
        return NextResponse.json({ verified: token?.isVerified === true }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Jupiter API error:', error);
        return NextResponse.json({ error: 'Failed to fetch jupiter data' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
}
