import {
    BaseReceiptImage,
    createReceipt,
    fetchReceiptImage,
    getCachedReceipt,
    getReceiptImageUrl,
    OG_IMAGE_SIZE,
    setCachedReceipt,
    storeReceiptImage,
} from '@features/receipt';
import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';

import { ifNoneMatchMatches, notModifiedResponse } from '@/app/shared/lib/http-utils';

export const runtime = 'edge';

const CACHE_DURATION = 30 * 60; // 30 minutes
const CACHE_HEADERS = {
    'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=60, max-age=${CACHE_DURATION}`,
};

type Props = Readonly<{
    params: { signature: string };
}>;

export async function GET(request: NextRequest, { params }: Props) {
    const { signature } = params;

    if (!signature) new Response('Signature is required', { status: 400 });

    const etag = createEtag(signature);
    if (ifNoneMatchMatches(request.headers, etag)) return notModifiedResponse({ cacheHeaders: CACHE_HEADERS, etag });

    try {
        const receipt = await createReceipt(signature);

        const imageResponse = new ImageResponse(<BaseReceiptImage data={receipt} />, {
            ...OG_IMAGE_SIZE,
        });
        const imageBuffer = await imageResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            headers: { ...CACHE_HEADERS, 'Content-Type': 'image/png', ETag: etag },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return new NextResponse(`Failed to process request: ${message}`, { status: 500 });
    }
}

function createEtag(signature: string): string {
    return `"${signature}"`;
}
