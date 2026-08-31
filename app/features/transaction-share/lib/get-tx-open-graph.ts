import { IMAGE_SIZE } from '@entities/open-graph';
import { Cluster, clusterSlug, type ServerCluster } from '@utils/cluster';
import type { Metadata } from 'next/types';

import { TX_OG_BASE_URL } from './constants';

/**
 * Open Graph tags for a transaction page. `type` and `url` are the two whose absence stops Slack unfurling
 * `/tx/<signature>`, so both are always set. There is no feature flag, hence no `| undefined` return.
 */
export function getTxOpenGraph(signature: string, cluster?: ServerCluster): Metadata['openGraph'] {
    return {
        images: [{ ...IMAGE_SIZE, alt: 'Solana Transaction', url: getTxOgImageUrl(signature, cluster) }],
        type: 'website',
        url: `${TX_OG_BASE_URL}/tx/${signature}${clusterQuery(cluster)}`,
    };
}

/** Exported so `page.tsx` can aim `twitter.images` at the same URL instead of rebuilding it. */
export function getTxOgImageUrl(signature: string, cluster?: ServerCluster): string {
    return `${TX_OG_BASE_URL}/og/tx/${signature}${clusterQuery(cluster)}`;
}

// Mainnet is the route's own default, so emitting the param there would only make a shared link noisier.
function clusterQuery(cluster: ServerCluster | undefined): string {
    if (cluster === undefined || cluster === Cluster.MainnetBeta) return '';
    return `?cluster=${clusterSlug(cluster)}`;
}
