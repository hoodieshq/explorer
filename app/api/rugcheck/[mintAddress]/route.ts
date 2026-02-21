import { NextResponse } from 'next/server';

const RUGCHECK_API_KEY = process.env.RUGCHECK_API_KEY;

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
        const headers: HeadersInit = RUGCHECK_API_KEY ? { 'x-api-key': RUGCHECK_API_KEY } : {};
        const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`, { headers });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch rugcheck data' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ score: data.score_normalised });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch rugcheck data' }, { status: 500 });
    }
}
