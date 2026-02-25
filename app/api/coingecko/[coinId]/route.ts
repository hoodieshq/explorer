import { NextResponse } from 'next/server';

// Cache for 4 hours, allow stale for 1 hour while revalidating
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=14400, stale-while-revalidate=3600' };

const COINGECKO_QUERY = [
    'community_data=false',
    'developer_data=false',
    'localization=false',
    'market_data=true',
    'sparkline=false',
    'tickers=false',
].join('&');

type Params = {
    params: {
        coinId: string;
    };
};

export async function GET(_request: Request, { params: { coinId } }: Params) {
    if (!coinId) {
        return NextResponse.json({ error: 'Missing coin id' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?${COINGECKO_QUERY}`, {
            next: { revalidate: 60 },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch coingecko data' }, { headers: CACHE_HEADERS, status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Coingecko API error:', error);
        return NextResponse.json({ error: 'Failed to fetch coingecko data' }, { headers: { 'Cache-Control': 'no-store, max-age=0' }, status: 500 });
    }
}
