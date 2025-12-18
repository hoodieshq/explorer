import { NextRequest, NextResponse } from 'next/server';

const CACHE_DURATION = 60 * 60; // 60 minutes

const CACHE_HEADERS = {
    'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=60`,
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { addresses, chainId } = body;

        if (!addresses || !Array.isArray(addresses)) {
            return NextResponse.json({ error: 'Invalid addresses parameter' }, { status: 400 });
        }

        if (!chainId) {
            return NextResponse.json({ error: 'Missing chainId parameter' }, { status: 400 });
        }

        const response = await fetch(`https://token-list-api.solana.cloud/v1/mints?chainId=${chainId}`, {
            body: JSON.stringify({ addresses }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        });

        const data = await response.json();

        return NextResponse.json(data, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Error in token-list API route:', error);
        return NextResponse.json(
            { content: [] },
            {
                headers: CACHE_HEADERS,
                status: 200,
            }
        );
    }
}
