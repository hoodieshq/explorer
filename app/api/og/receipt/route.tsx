import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const sender = searchParams.get('sender') || '';
        const receiver = searchParams.get('receiver') || '';
        const date = searchParams.get('date') || '';
        const memo = searchParams.get('memo') || '';
        const transfers = searchParams.get('transfers') || '';
        const instructions = searchParams.get('instructions') || '';
        let transfersData: any[] = [];
        let instructionsData: string[] = [];

        try {
            transfersData = transfers ? JSON.parse(transfers) : [];
        } catch {
            transfersData = [];
        }

        try {
            instructionsData = instructions ? JSON.parse(instructions) : [];
        } catch {
            instructionsData = [];
        }

        const hasNoTransfers = transfersData.length === 0;
        const hasMultipleTransfers = transfersData.length > 1;

        return new ImageResponse(
            (
                <div
                    style={{
                        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        width: '100%',
                        padding: '60px',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            background: 'linear-gradient(180deg, #1e2d2d 0%, #162424 100%)',
                            width: '900px',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '0',
                            overflow: 'hidden',
                        }}
                    >

                        {/* Content */}
                        <div
                            style={{
                                position: 'relative',
                                zIndex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '50px 60px',
                                height: '550px',
                            }}
                        >
                        </div>
                    </div>
                </div>
            ),
            {
                height: 630,
                width: 1200,
            }
        );
    } catch (e: any) {
        console.error('Error generating OG image:', e);
        return new Response(`Failed to generate image: ${e.message}`, {
            status: 500,
        });
    }
}
