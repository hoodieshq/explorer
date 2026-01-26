import { BaseReceiptImage, createReceipt, OG_IMAGE_SIZE } from '@features/receipt';
import { fetchReceiptImage, getReceiptImageUrl, storeReceiptImage } from '@features/receipt/lib/blob-storage';
import { getCachedReceipt, setCachedReceipt } from '@features/receipt/lib/cache';
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

        const [interRegularData, interSemiBoldData, robotoMonoData] = await Promise.all([
            fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf').then(res => res.arrayBuffer()),
            fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf').then(res => res.arrayBuffer()),
            fetch('https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.ttf').then(res => res.arrayBuffer()),
        ]);

        const imageResponse = new ImageResponse(<BaseReceiptImage data={receipt} />, {
            ...OG_IMAGE_SIZE,
            fonts: [
                {
                    data: interRegularData,
                    name: 'Inter',
                    style: 'normal',
                    weight: 400,
                },
                {
                    data: interSemiBoldData,
                    name: 'Inter',
                    style: 'normal',
                    weight: 600,
                },
                {
                    data: robotoMonoData,
                    name: 'Roboto Mono',
                    style: 'normal',
                    weight: 400,
                },
            ],
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
