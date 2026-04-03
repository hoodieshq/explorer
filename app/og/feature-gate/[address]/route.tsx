import { BaseFeatureGateImage, isFeatureGateOgEnabled, OG_IMAGE_SIZE } from '@features/feature-gate/server';
import { isAddress } from '@solana/kit';
import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';

import { Logger } from '@/app/shared/lib/logger';
import { getFeatureInfo } from '@/app/utils/feature-gate/utils';

export const runtime = 'edge';

const CACHE_DURATION = 24 * 60 * 60; // 24 hours — feature gate data rarely changes
const CACHE_HEADERS = {
    'Cache-Control': `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}, stale-while-revalidate=60`,
};

type Props = Readonly<{
    params: { address: string };
}>;

export async function GET(_request: NextRequest, { params }: Props) {
    const { address } = params;

    if (!isFeatureGateOgEnabled()) return new NextResponse('Not Found', { status: 404 });
    if (!address || !isAddress(address)) return new NextResponse('Invalid address', { status: 400 });

    const feature = getFeatureInfo(address);
    if (!feature) return new NextResponse('Feature not found', { status: 404 });

    // TODO: temporary static image test — remove after debugging Twitter card issue
    const origin = new URL(_request.url).origin;
    const res = await fetch(`${origin}/og-test.png`);
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
        headers: { ...CACHE_HEADERS, 'Content-Type': 'image/png' },
    });
}
