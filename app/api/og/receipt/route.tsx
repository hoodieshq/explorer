import { getData, OG_IMAGE_SIZE, ReceiptImage } from '@features/receipt';
import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    // Long description url:
    // http://localhost:3000/api/og/receipt?sender=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU&receiver=9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM&date=2024-01-15+14%3A30%3A00&description=This+is+a+very+long+description+that+demonstrates+how+the+receipt+component+handles+extended+text+content.+It+includes+multiple+sentences+and+various+details+about+the+transaction%2C+such+as+the+purpose+of+the+payment%2C+the+services+rendered%2C+and+any+additional+context+that+might+be+relevant+to+understanding+the+nature+of+this+particular+blockchain+transaction+on+the+Solana+network.&network=Mainnet&fee=0.000005&total=1250.75
    const { searchParams } = new URL(request.url);

    const signature = searchParams.get('signature');
    if (!signature) {
        return new Response('Signature is required', {
            status: 400,
        });
    }

    try {
        const data = await getData(signature, searchParams);
        return new ImageResponse(<ReceiptImage data={data} />, {
            ...OG_IMAGE_SIZE,
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return new NextResponse(`Failed to process request: ${message}`, {
            status: 500,
        });
    }
}
