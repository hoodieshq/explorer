import { NextResponse } from 'next/server';

import Logger from '@/app/utils/logger';
import { CACHE_HEADERS, NO_STORE_HEADERS, CACHE_MAX_AGE } from '../../config';

// eslint-disable-next-line no-restricted-syntax -- CoinGecko coin IDs only contain lowercase letters, numbers, and hyphens
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
                { headers: NO_STORE_HEADERS, status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { headers: CACHE_HEADERS });
    } catch (error) {
        Logger.error('Coingecko API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch coingecko data' },
            { headers: NO_STORE_HEADERS, status: 500 }
        );
    }
}
