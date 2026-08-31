import { gen } from '@__fixtures__/gen';
import { getTxShareData, type TxShareData } from '@features/transaction-share/server';
import { Cluster } from '@utils/cluster';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

// No `vi.resetModules()`, so the route and this file share one module generation and these two mocks can
// be imported statically. The route reads no env at module scope, so it has nothing to re-evaluate.
vi.mock('next/og', () => ({
    ImageResponse: vi.fn(function () {
        return new Response('mock-image-response', {
            headers: { 'Content-Type': 'image/png' },
            status: 200,
        });
    }),
}));

vi.mock('@features/transaction-share/server', () => ({
    BaseTxImage: vi.fn(() => null),
    getTxShareData: vi.fn(),
}));

const SIGNATURE = gen.signature(1);
const RESOLVED_CACHE_CONTROL = 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=60';
// Shorter on purpose: the fallback is only correct until the transaction propagates.
const FALLBACK_CACHE_CONTROL = 'public, max-age=60, s-maxage=60, stale-while-revalidate=60';

const shareData: TxShareData = {
    dateUtc: 'Aug 31, 2026 at 11:00:00 UTC',
    fee: '0.000005 SOL',
    instructions: [],
    signature: SIGNATURE,
    slot: Number(gen.slot(1)),
    status: 'success',
};

function makeRequest(signature: string, cluster?: string) {
    const query = cluster === undefined ? '' : `?cluster=${cluster}`;
    return new NextRequest(`http://localhost:3000/og/tx/${signature}${query}`);
}

function makeProps(signature: string) {
    return { params: Promise.resolve({ signature }) };
}

describe('should handle GET /og/tx/[signature]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(getTxShareData).mockResolvedValue({ data: shareData, kind: 'ok' });
    });

    it('should return a PNG with 30 minute cache headers for a valid signature', async () => {
        const response = await GET(makeRequest(SIGNATURE), makeProps(SIGNATURE));

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('image/png');
        expect(response.headers.get('Cache-Control')).toBe(RESOLVED_CACHE_CONTROL);
        expect(getTxShareData).toHaveBeenCalledWith(SIGNATURE, undefined);
    });

    it('should return 400 for an invalid transaction signature', async () => {
        const response = await GET(makeRequest('not-a-signature'), makeProps('not-a-signature'));

        expect(response.status).toBe(400);
        expect(await response.text()).toBe('Invalid transaction signature');
        expect(getTxShareData).not.toHaveBeenCalled();
    });

    it('should return 400 when the cluster param is custom', async () => {
        const response = await GET(makeRequest(SIGNATURE, 'custom'), makeProps(SIGNATURE));

        expect(response.status).toBe(400);
        expect(await response.text()).toBe('Invalid cluster');
        expect(getTxShareData).not.toHaveBeenCalled();
    });

    it('should return 400 when the cluster param is not a known slug', async () => {
        const response = await GET(makeRequest(SIGNATURE, 'sandbox'), makeProps(SIGNATURE));

        expect(response.status).toBe(400);
        expect(getTxShareData).not.toHaveBeenCalled();
    });

    it('should resolve against devnet when the cluster param is devnet', async () => {
        const response = await GET(makeRequest(SIGNATURE, 'devnet'), makeProps(SIGNATURE));

        expect(response.status).toBe(200);
        expect(getTxShareData).toHaveBeenCalledWith(SIGNATURE, Cluster.Devnet);
    });

    it('should render the fallback image when the transaction is not found', async () => {
        vi.mocked(getTxShareData).mockResolvedValue({ kind: 'not-found' });

        const response = await GET(makeRequest(SIGNATURE), makeProps(SIGNATURE));

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('image/png');
        // A just-landed transaction reads as not-found, so this card must expire long before a resolved one.
        expect(response.headers.get('Cache-Control')).toBe(FALLBACK_CACHE_CONTROL);
        const [element] = vi.mocked(ImageResponse).mock.calls[0];
        // `ReactElement` declares its props as `unknown`, so the shape this route passes is named here.
        expect((element.props as { data?: TxShareData }).data).toBeUndefined();
    });

    it('should return 502 when the data layer errors', async () => {
        vi.mocked(getTxShareData).mockResolvedValue({ kind: 'error' });

        const response = await GET(makeRequest(SIGNATURE), makeProps(SIGNATURE));

        expect(response.status).toBe(502);
        expect(await response.text()).toBe('Failed to load transaction');
    });

    it('should return 500 when image generation fails', async () => {
        vi.mocked(ImageResponse).mockImplementationOnce(function () {
            throw new Error('Render failed');
        });

        const response = await GET(makeRequest(SIGNATURE), makeProps(SIGNATURE));

        expect(response.status).toBe(500);
        expect(await response.text()).toBe('Failed to process request');
    });
});
