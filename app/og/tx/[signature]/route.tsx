import { IMAGE_SIZE } from '@entities/open-graph/server';
import { BaseTxImage, getTxShareData } from '@features/transaction-share/server';
import { isSignature } from '@solana/kit';
import { Cluster, clusterFromSlug, type ServerCluster } from '@utils/cluster';
import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';

import { Logger } from '@/app/shared/lib/logger';

// A resolved transaction is immutable, so its card can sit in a cache for a long time.
const RESOLVED_CACHE_DURATION = 30 * 60; // 30 min
// The fallback is not: a transaction is "not found" only until it propagates. The probe sees it at
// `processed` while the fetch reads at `confirmed`, so a link shared the second it lands renders the
// fallback. A short TTL lets the real card replace it in a minute instead of pinning the empty one.
const FALLBACK_CACHE_DURATION = 60; // 1 min

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
        if (result.kind === 'error') return new NextResponse('Failed to load transaction', { status: 502 });

        // A missing transaction still renders: BaseTxImage draws its own fallback, so a stale link unfurls as
        // a branded card instead of a broken image.
        const data = result.kind === 'ok' ? result.data : undefined;

        const imageResponse = new ImageResponse(<BaseTxImage data={data} />, { ...IMAGE_SIZE });
        const imageBuffer = await imageResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            headers: {
                ...cacheHeaders(data ? RESOLVED_CACHE_DURATION : FALLBACK_CACHE_DURATION),
                'Content-Type': 'image/png',
            },
        });
    } catch (e) {
        Logger.error(new Error('[og:tx] Failed to generate image', { cause: e }), { sentry: true, signature });
        return new NextResponse('Failed to process request', { status: 500 });
    }
}

function cacheHeaders(duration: number) {
    return { 'Cache-Control': `public, max-age=${duration}, s-maxage=${duration}, stale-while-revalidate=60` };
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
