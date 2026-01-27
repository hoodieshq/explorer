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

export const runtime = 'edge';

const CACHE_DURATION = 30 * 60; // 30 minutes
const CACHE_HEADERS = {
    'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=60`,
};

type Props = Readonly<{
    params: { signature: string };
}>;

export async function GET(_request: NextRequest, { params }: Props) {
    const { signature } = params;

    if (!signature) {
        return new Response('Signature is required', { status: 400 });
    }

    try {
        const blobUrl = await getReceiptImageUrl(signature);
        if (blobUrl) {
            const imageBuffer = await fetchReceiptImage(blobUrl);
            if (imageBuffer) {
                return new NextResponse(imageBuffer, {
                    headers: { ...CACHE_HEADERS, 'Content-Type': 'image/png', Etag: `"${signature}"` },
                });
            }
        }

        let receipt = getCachedReceipt(signature);

        if (!receipt) {
            receipt = await createReceipt(signature);
            if (receipt) setCachedReceipt(signature, receipt);
        }

        const imageResponse = new ImageResponse(<BaseReceiptImage data={receipt} />, {
            ...OG_IMAGE_SIZE,
        });
        const imageBuffer = await imageResponse.arrayBuffer();

        storeReceiptImage(signature, imageBuffer).catch(() => {});

        return new NextResponse(imageBuffer, {
            headers: { ...CACHE_HEADERS, 'Content-Type': 'image/png', Etag: `"${signature}"` },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return new NextResponse(`Failed to process request: ${message}`, { status: 500 });
    }
}
