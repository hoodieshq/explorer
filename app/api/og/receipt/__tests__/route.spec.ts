import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

vi.mock('next/og', () => ({
    ImageResponse: vi.fn(() => {
        return new Response('mock-image-response', {
            headers: {
                'Content-Type': 'image/png',
            },
            status: 200,
        });
    }),
}));

vi.mock('@features/receipt', () => ({
    OG_IMAGE_SIZE: { height: 630, width: 1200 },
    ReceiptImage: vi.fn(() => null),
    getData: vi.fn(),
}));

describe('GET /api/og/receipt', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates image successfully with signature', async () => {
        const { getData } = await import('@features/receipt');
        vi.mocked(getData).mockResolvedValue({
            date: '2024-01-15 14:30:00',
            description: 'Payment for services',
            fee: '0.000005',
            network: 'Mainnet',
            receiver: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
            sender: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            total: '1.5',
        });

        const url = new URL('http://localhost:3000/api/og/receipt');
        url.searchParams.set('signature', 'test-signature-123');
        const request = new NextRequest(url.toString());

        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('image/png');
        expect(getData).toHaveBeenCalledWith('test-signature-123', expect.any(URLSearchParams));
    });

    it('returns 500 when getData fails', async () => {
        const { getData } = await import('@features/receipt');
        vi.mocked(getData).mockRejectedValue(new Error('Transaction not found'));

        const url = new URL('http://localhost:3000/api/og/receipt');
        url.searchParams.set('signature', 'test-signature-123');
        const request = new NextRequest(url.toString());

        const response = await GET(request);

        expect(response.status).toBe(500);
        const text = await response.text();
        expect(text).toContain('Transaction not found');
    });
});
