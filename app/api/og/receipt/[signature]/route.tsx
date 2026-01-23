import { BaseReceiptImage, createReceipt, OG_IMAGE_SIZE } from '@features/receipt';
import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type Props = Readonly<{
    params: { signature: string };
}>;

export async function GET(_request: NextRequest, { params }: Props) {
    const { signature } = params;

    if (!signature) {
        return new Response('Signature is required', {
            status: 400,
        });
    }

    try {
        const receipt = await createReceipt(signature);

        return new ImageResponse(<BaseReceiptImage data={receipt} />, OG_IMAGE_SIZE);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return new NextResponse(`Failed to process request: ${message}`, {
            status: 500,
        });
    }
}
