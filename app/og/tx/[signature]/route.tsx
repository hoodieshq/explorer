import { IMAGE_SIZE } from '@entities/open-graph/server';
import { BaseTxImage, getTxShareData } from '@features/transaction-share/server';
import { isSignature } from '@solana/kit';
import { Cluster, clusterFromSlug, type ServerCluster } from '@utils/cluster';
import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';

import { Logger } from '@/app/shared/lib/logger';

const CACHE_DURATION = 30 * 60; // 30 min
const CACHE_HEADERS = {
    'Cache-Control': `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}, stale-while-revalidate=60`,
};

type Props = Readonly<{
    params: Promise<{ signature: string }>;
}>;

type ClusterParam = { kind: 'ok'; cluster?: ServerCluster } | { kind: 'invalid' };

export async function GET(request: NextRequest, props: Props) {
    const { signature } = await props.params;

    if (!signature || !isSignature(signature)) {
        return new NextResponse('Invalid transaction signature', { status: 400 });
    }

    const clusterParam = resolveClusterParam(request);
    if (clusterParam.kind === 'invalid') return new NextResponse('Invalid cluster', { status: 400 });

    try {
        const result = await getTxShareData(signature, clusterParam.cluster);
        // The result carries no status of its own: every failure it reports is upstream of us - a cluster we
        // could not reach, or a fetch that threw - so they all answer 502. A render failure below is our own
        // and stays a 500.
        if (result.kind === 'error') return new NextResponse('Failed to load transaction', { status: 502 });

        // A missing transaction still renders: BaseTxImage draws its own fallback, so a stale link unfurls as
        // a branded card instead of a broken image.
        const data = result.kind === 'ok' ? result.data : undefined;

        const imageResponse = new ImageResponse(<BaseTxImage data={data} />, { ...IMAGE_SIZE });
        const imageBuffer = await imageResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            headers: { ...CACHE_HEADERS, 'Content-Type': 'image/png' },
        });
    } catch (e) {
        Logger.error(new Error('[og:tx] Failed to generate image', { cause: e }), { sentry: true, signature });
        return new NextResponse('Failed to process request', { status: 500 });
    }
}

function resolveClusterParam(request: NextRequest): ClusterParam {
    const slug = request.nextUrl.searchParams.get('cluster') ?? undefined;
    // An absent param is not an error: it means mainnet by the app's own contract, and getTxShareData probes.
    if (slug === undefined) return { kind: 'ok' };

    const cluster = clusterFromSlug(slug);
    // Custom is rejected rather than resolved. Its URL is client-supplied, so honouring it on an
    // unauthenticated route would let a caller aim our server at any host - the reason serverClusterUrl
    // takes ServerCluster at all (app/entities/cluster/lib/cluster.ts:112-115).
    if (cluster === undefined || cluster === Cluster.Custom) return { kind: 'invalid' };

    return { cluster, kind: 'ok' };
}
