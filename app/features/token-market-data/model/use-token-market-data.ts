import { is } from 'superstruct';
import useSWR from 'swr';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';
import useTabVisibility from '@/app/utils/use-tab-visibility';

import { type TokenMarketDataResult, TokenMarketDataSchema, TokenMarketDataStatus } from '../lib/types';
import { MARKET_DATA_SWR_CONFIG } from './market-data-cache';

type SwrKey = ['token-market-data', string];

function getSwrKey(cluster: Cluster, address: string, isTabVisible: boolean, isTokenMint: boolean): SwrKey | null {
    // eslint-disable-next-line unicorn/no-null
    if (!isTokenMint || !isTabVisible || cluster !== Cluster.MainnetBeta) return null;
    return ['token-market-data', address];
}

/** @internal exported for testing */
export const RATE_LIMITED = 'RATE_LIMITED';

/** @internal exported for testing */
export async function fetchTokenMarketData([, address]: SwrKey): Promise<TokenMarketDataResult> {
    const response = await fetch(`/api/token-market-data/${address}`);

    if (!response.ok) {
        if (response.status === 429) throw new Error(RATE_LIMITED);
        // 404 = no market data, a permanent result worth caching.
        if (response.status === 404) return { status: TokenMarketDataStatus.FetchFailed };
        throw new Error(`Market data API error: ${response.status}`);
    }

    const data = await response.json();
    if (!is(data, TokenMarketDataSchema)) throw new Error('Market data schema validation failed');

    return {
        stats: {
            lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : undefined,
            marketCap: data.marketCap,
            marketCapRank: data.marketCapRank ?? undefined,
            price: data.price,
            priceChange24h: data.priceChange24h,
            volume24h: data.volume24h,
        },
        status: TokenMarketDataStatus.Success,
    };
}

export function useTokenMarketData(address: string, isTokenMint = true): TokenMarketDataResult | undefined {
    const { cluster } = useCluster();
    const { visible: isTabVisible } = useTabVisibility();
    const swrKey = getSwrKey(cluster, address, isTabVisible, isTokenMint);
    const { data, error, isLoading } = useSWR(swrKey, fetchTokenMarketData, MARKET_DATA_SWR_CONFIG);

    if (isLoading && !data) return { status: TokenMarketDataStatus.Loading };
    if (error) {
        return {
            status:
                error?.message === RATE_LIMITED ? TokenMarketDataStatus.RateLimited : TokenMarketDataStatus.FetchFailed,
        };
    }
    return data;
}

export { TokenMarketDataStatus } from '../lib/types';
