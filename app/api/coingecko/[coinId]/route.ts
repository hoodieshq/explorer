import { NextResponse } from 'next/server';

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
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?${COINGECKO_QUERY}`);

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch coingecko data' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Coingecko API error:', error);
        return NextResponse.json({ error: 'Failed to fetch coingecko data' }, { status: 500 });
    }
}
