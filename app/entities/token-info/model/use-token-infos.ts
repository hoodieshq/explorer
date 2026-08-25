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
 * Resolves metadata for a whole list of mints in one go, for callers that must know
 * something about every mint before they can render — ordering holdings by
 * verification, for one. Prefer `useTokenInfo` when a component needs a single mint.
 *
 * `mints` must be referentially stable across renders (memoize it in the caller):
 * its identity drives both the SWR key and the fetch, so a fresh array each render
 * would refetch the list on every render.
 */
export function useTokenInfos(mints: readonly string[], cluster: Cluster, genesisHash?: string): UseTokenInfosResult {
    // Joining is O(list) and runs only when the caller's array identity changes. Keying
    // on the mints themselves — rather than on the owner address — keeps this hook
    // unaware of who holds them, and lets two owners of the same set share one entry.
    const mintsKey = useMemo(() => mints.join(','), [mints]);

    const { data, isLoading } = useSWR(
        // `undefined` disables the fetch, exactly as `null` would; SWR treats any falsy key alike.
        mintsKey ? ['token-infos', mintsKey, cluster, genesisHash] : undefined,
        () => fetchTokenInfos(mints, cluster, genesisHash),
        // A mint's verified status changes on the scale of days, and refetching costs a
        // request proportional to the holdings list, so do not re-run it on tab focus.
        { revalidateOnFocus: false },
    );

    return { isLoading, tokenInfos: data ?? NO_TOKEN_INFOS };
}
