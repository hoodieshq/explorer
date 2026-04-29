'use client';

import { useCluster } from '@providers/cluster';
import useSWRImmutable from 'swr/immutable';

import { ClusterStatus } from '@/app/utils/cluster';

interface UseAccountHistoryResult<R> {
    data: R | undefined;
    error: unknown;
    isLoading: boolean;
}

/**
 * Shared SWR wrapper for per-account history fetches. Gates the request on cluster readiness
 * so SWR doesn't fire once with the default cluster and again with the URL-derived one.
 *
 * `cacheKeyPrefix` namespaces SWR keys per feature; `keyArgs` are extra cache-key inputs
 * (e.g. seed) — anything that, when changed, should invalidate the cached result.
 */
export function useAccountHistory<R>(
    cacheKeyPrefix: string,
    keyArgs: readonly unknown[],
    fetcher: (rpcUrl: string) => Promise<R>,
): UseAccountHistoryResult<R> {
    const { url, status } = useCluster();
    const isReady = status === ClusterStatus.Connected;

    const { data, error, isLoading } = useSWRImmutable<R>(isReady ? [cacheKeyPrefix, ...keyArgs, url] : null, () =>
        fetcher(url),
    );

    return { data, error, isLoading: isLoading || !isReady };
}
