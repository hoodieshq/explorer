'use client';

import { Token } from '@solflare-wallet/utl-sdk';
import { Cluster } from '@utils/cluster';
import { getTokenInfoSwrKey } from '@utils/token-info';
import { useEffect } from 'react';
import useSWR from 'swr';

import { useTokenInfoBatch } from './token-info-batch-provider';

export function useTokenInfo(
    fetchTokenLabelInfo: boolean | undefined,
    pubkey: string,
    cluster: Cluster,
    genesisHash?: string,
): Token | undefined {
    const requestTokenInfo = useTokenInfoBatch();

    useEffect(() => {
        if (fetchTokenLabelInfo && pubkey) {
            requestTokenInfo(pubkey, cluster, genesisHash);
        }
    }, [fetchTokenLabelInfo, pubkey, cluster, genesisHash, requestTokenInfo]);

    const { data } = useSWR<Token | undefined>(
        fetchTokenLabelInfo ? getTokenInfoSwrKey(pubkey, cluster, genesisHash) : null,
        null,
    );

    return data;
}

/**
 * Read-only counterpart to useTokenInfo. Returns cached token info for a mint by SWR key and never enqueues a
 * request - use it where another consumer (e.g. holdings rows) already drives the fetch.
 */
export function useGetTokenInfo(pubkey: string, cluster: Cluster, genesisHash?: string): Token | undefined {
    const { data } = useSWR<Token | undefined>(pubkey ? getTokenInfoSwrKey(pubkey, cluster, genesisHash) : null, null);
    return data;
}
