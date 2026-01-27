import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

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
    BaseReceiptImage: vi.fn(() => null),
    OG_IMAGE_SIZE: { height: 630, width: 1200 },
    createReceipt: vi.fn(),
    getCachedReceipt: vi.fn(),
    getReceiptImageUrl: vi.fn().mockResolvedValue(null),
    storeReceiptImage: vi.fn().mockResolvedValue(null),
}));

describe('GET /api/og/receipt/[signature]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate image successfully with signature', async () => {
        const { createReceipt } = await import('@features/receipt');
        const url = new URL('http://localhost:3000/api/og/receipt/test-signature-123');
        const request = new NextRequest(url.toString());

        const response = await GET(request, { params: { signature: 'test-signature-123' } });

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('image/png');
        expect(createReceipt).toHaveBeenCalledWith('test-signature-123');
    });

    it('should return 500 when createReceipt fails', async () => {
        const { createReceipt } = await import('@features/receipt');
        vi.mocked(createReceipt).mockRejectedValue(new Error('Transaction not found'));

        const url = new URL('http://localhost:3000/api/og/receipt/test-signature-123');
        const request = new NextRequest(url.toString());

        const response = await GET(request, { params: { signature: 'test-signature-123' } });

        expect(response.status).toBe(500);
        const text = await response.text();
        expect(text).toContain('Transaction not found');
    });
});
