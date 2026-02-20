import useSWR from 'swr';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';
import useTabVisibility from '@/app/utils/use-tab-visibility';

import { TOKEN_VERIFICATION_SWR_CONFIG } from './token-verification-cache';

export enum CoingeckoStatus {
    Success,
    FetchFailed,
    Loading,
}

export interface CoinInfo {
    price: number;
    volume_24: number;
    market_cap: number;
    price_change_percentage_24h: number;
    market_cap_rank: number;
    last_updated: Date;
}

export interface CoinInfoResult {
    last_updated: string;
    market_cap_rank: number;
    market_data: {
        current_price: {
            usd: number;
        };
        market_cap: {
            usd: number;
        };
        price_change_percentage_24h_in_currency: {
            usd: number;
        };
        total_volume: {
            usd: number;
        };
    };
}

export type CoinGeckoResult = {
    coinInfo?: CoinInfo;
    status: CoingeckoStatus;
};

type CoinGeckoSwrKey = ['coingecko', string];

function getCoinGeckoSwrKey(
    cluster: Cluster,
    coinId: string | undefined,
    isTabVisible: boolean
): CoinGeckoSwrKey | null {
    if (coinId === 'solana') {
        return null;
    }

    if (!isTabVisible) {
        return null;
    }

    if (cluster !== Cluster.MainnetBeta) {
        return null;
    }

    if (!coinId) {
        return null;
    }

    return ['coingecko', coinId];
}

async function fetchCoinGeckoVerification([, coinId]: CoinGeckoSwrKey): Promise<CoinGeckoResult> {
    try {
        const response = await fetch(`/api/coingecko/${coinId}`);

        if (!response.ok) {
            return {
                status: CoingeckoStatus.FetchFailed,
            };
        }

        const info = (await response.json()) as CoinInfoResult;
        return {
            coinInfo: {
                last_updated: new Date(info.last_updated),
                market_cap: info.market_data.market_cap.usd,
                market_cap_rank: info.market_cap_rank,
                price: info.market_data.current_price.usd,
                price_change_percentage_24h: info.market_data.price_change_percentage_24h_in_currency.usd,
                volume_24: info.market_data.total_volume.usd,
            },
            status: CoingeckoStatus.Success,
        };
    } catch {
        return {
            status: CoingeckoStatus.FetchFailed,
        };
    }
}

export function useCoinGeckoVerification(coinId?: string): CoinGeckoResult | undefined {
    const { cluster } = useCluster();
    const { visible: isTabVisible } = useTabVisibility();
    const swrKey = getCoinGeckoSwrKey(cluster, coinId, isTabVisible);
    const { data, isLoading } = useSWR(swrKey, fetchCoinGeckoVerification, TOKEN_VERIFICATION_SWR_CONFIG);

    if (isLoading && !data) {
        return {
            status: CoingeckoStatus.Loading,
        };
    }

    return data ?? undefined;
}
