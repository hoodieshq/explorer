import { boolean, is, optional, string, type } from 'superstruct';
import useSWR from 'swr';

import { useCluster } from '@/app/providers/cluster';
import { Logger } from '@/app/shared/lib/logger';
import { Cluster } from '@/app/utils/cluster';
import useTabVisibility from '@/app/utils/use-tab-visibility';

import { TOKEN_VERIFICATION_SWR_CONFIG } from './token-verification-cache';

const CoinGeckoResultSchema = type({ coinGeckoId: optional(string()), verified: boolean() });

export enum CoingeckoStatus {
    Success,
    FetchFailed,
    Loading,
    RateLimited,
}

export type CoinGeckoResult = { coinGeckoId?: string; verified: boolean; status: CoingeckoStatus };

type CoinGeckoSwrKey = ['coingecko', string];

function getCoinGeckoSwrKey(
    cluster: Cluster,
    address: string,
    isTabVisible: boolean,
    enabled: boolean,
): CoinGeckoSwrKey | null {
    // SWR treats a null key as "skip fetch" — only fetch for a visible mainnet token mint.
    // eslint-disable-next-line unicorn/no-null
    if (!enabled || !isTabVisible || cluster !== Cluster.MainnetBeta) return null;
    return ['coingecko', address];
}

/** @internal exported for testing */
export const RATE_LIMITED = 'RATE_LIMITED';

/** @internal exported for testing */
export async function fetchCoinGeckoVerification([, address]: CoinGeckoSwrKey): Promise<CoinGeckoResult> {
    const response = await fetch(`/api/verification/coingecko/${address}`);

    if (!response.ok) {
        if (response.status === 429) throw new Error(RATE_LIMITED);
        if (response.status === 404) return { status: CoingeckoStatus.FetchFailed, verified: false };
        throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    if (!is(data, CoinGeckoResultSchema)) {
        // Client/server schema drift — capture it; otherwise it silently renders unverified.
        const error = new Error('CoinGecko schema validation failed');
        Logger.error(error, { address, sentry: true });
        throw error;
    }

    return { coinGeckoId: data.coinGeckoId, status: CoingeckoStatus.Success, verified: data.verified };
}

export function useCoinGeckoVerification(address: string, enabled = true): CoinGeckoResult | undefined {
    const { cluster } = useCluster();
    const { visible: isTabVisible } = useTabVisibility();
    const swrKey = getCoinGeckoSwrKey(cluster, address, isTabVisible, enabled);
    const { data, error, isLoading } = useSWR(swrKey, fetchCoinGeckoVerification, TOKEN_VERIFICATION_SWR_CONFIG);

    if (isLoading && !data) return { status: CoingeckoStatus.Loading, verified: false };
    if (error) {
        return {
            status: error?.message === RATE_LIMITED ? CoingeckoStatus.RateLimited : CoingeckoStatus.FetchFailed,
            verified: false,
        };
    }
    return data;
}
