import { NextResponse } from 'next/server';

const JUPITER_API_KEY = process.env.JUPITER_API_KEY;

export async function GET(_request: Request, { params }: { params: Promise<{ mintAddress: string }> }) {
    const { mintAddress } = await params;

    if (!mintAddress) {
        return NextResponse.json({ error: 'Missing mint address' }, { status: 400 });
    }

    try {
        const headers: HeadersInit = JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {};
        const response = await fetch(`https://api.jup.ag/tokens/v2/search?query=${mintAddress}`, { headers });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch jupiter data' }, { status: response.status });
        }

        const data = await response.json();
        const token = Array.isArray(data) ? data.find((t: { id?: string }) => t.id === mintAddress) : null;
        return NextResponse.json({ verified: token?.isVerified === true });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch jupiter data' }, { status: 500 });
    }
}
