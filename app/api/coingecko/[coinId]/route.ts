import Logger from '@/app/utils/logger';
import { NextResponse } from 'next/server';

const CACHE_MAX_AGE = 14400;
const CACHE_HEADERS = { 'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=3600` };

// CoinGecko coin IDs only contain lowercase letters, numbers, and hyphens
const VALID_COIN_ID = /^[a-z0-9-]+$/;

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
    if (!coinId || !VALID_COIN_ID.test(coinId)) {
        return NextResponse.json({ error: 'Invalid coin id' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?${COINGECKO_QUERY}`, {
            next: { revalidate: CACHE_MAX_AGE },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch coingecko data' },
                { headers: CACHE_HEADERS, status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { headers: CACHE_HEADERS });
    } catch (error) {
        Logger.error('Coingecko API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch coingecko data' },
            { headers: { 'Cache-Control': 'no-store, max-age=0' }, status: 500 }
        );
    }
}
