import { PublicKey } from '@solana/web3.js';
import { NextResponse } from 'next/server';

import Logger from '@/app/utils/logger';
import { CACHE_HEADERS, NO_STORE_HEADERS, CACHE_MAX_AGE } from '../../config';

const RUGCHECK_API_KEY = process.env.RUGCHECK_API_KEY;

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

    if (!RUGCHECK_API_KEY) {
        return NextResponse.json(
            { error: 'Rugcheck API key is not configured' },
            { headers: NO_STORE_HEADERS, status: 500 }
        );
    }

    try {
        const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`, {
            headers: { 'x-api-key': RUGCHECK_API_KEY },
            next: { revalidate: CACHE_MAX_AGE },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch rugcheck data' },
                { headers: NO_STORE_HEADERS, status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ score: data.score_normalised }, { headers: CACHE_HEADERS });
    } catch (error) {
        Logger.error('Rugcheck API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rugcheck data' },
            { headers: NO_STORE_HEADERS, status: 500 }
        );
    }
}
