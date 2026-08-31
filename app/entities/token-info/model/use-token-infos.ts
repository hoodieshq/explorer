'use client';

import { Cluster } from '@utils/cluster';
import { useMemo } from 'react';
import useSWR from 'swr';

import { fetchTokenInfos } from '../api/fetch-token-infos';
import type { TokenInfo } from '../lib/types';

const NO_TOKEN_INFOS: ReadonlyMap<string, TokenInfo> = new Map();

type UseTokenInfosResult = {
    tokenInfos: ReadonlyMap<string, TokenInfo>;
    isLoading: boolean;
};

/**
 * For callers that must know every mint before they can render anything. Use the
 * singular `useTokenInfo` for one mint.
 *
 * `mints` must be referentially stable across renders: its identity drives the fetch,
 * so a fresh array each render refetches the whole list each render.
 */
export function useTokenInfos(mints: readonly string[], cluster: Cluster, genesisHash?: string): UseTokenInfosResult {
    // Keyed on the mints rather than the owner, so two owners of the same set share an entry.
    const mintsKey = useMemo(() => mints.join(','), [mints]);

    const { data, isLoading } = useSWR(
        // SWR reads a falsy key as "do not fetch".
        mintsKey ? ['token-infos', mintsKey, cluster, genesisHash] : undefined,
        () => fetchTokenInfos(mints, cluster, genesisHash),
        // Verified status changes on the scale of days, and a refetch costs a request per chunk.
        { revalidateOnFocus: false },
    );

    return { isLoading, tokenInfos: data ?? NO_TOKEN_INFOS };
}
