/**
 * Token search via the Solana token-list API.
 *
 * @see https://token-list-api.solana.cloud
 * @see https://github.com/solflare-wallet/utl-api
 */

import { Address } from '@solana/kit';
import { Cluster } from '@utils/cluster';

import { Logger } from '@/app/shared/lib/logger';

import type { SearchItem } from '../lib/types';

type TokenSearchApiResponse = {
    content: {
        address: Address;
        chainId: number;
        name: string;
        symbol: string;
        verified: boolean;
        decimals: number;
        holders: number;
        logoUri: string;
        tags: string[];
    }[];
};

// https://github.com/solflare-wallet/utl-sdk/blob/master/src/types.ts#L5
const CHAIN_IDS: Partial<Record<Cluster, number>> = {
    [Cluster.MainnetBeta]: 101,
    [Cluster.Testnet]: 102,
    [Cluster.Devnet]: 103,
};

export const TOKEN_SEARCH_API_URL = 'https://token-list-api.solana.cloud/v1/search';

const SEARCH_TIMEOUT_MS = 5_000;
const SEARCH_LIMIT = 20;

export async function searchTokens(query: string, cluster: Cluster): Promise<SearchItem[]> {
    if (process.env.NEXT_PUBLIC_DISABLE_TOKEN_SEARCH || !query) {
        return [];
    }

    const chainId = CHAIN_IDS[cluster];
    if (chainId == null) return [];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
        const url = new URL(TOKEN_SEARCH_API_URL);
        url.searchParams.set('query', query);
        url.searchParams.set('chainId', chainId.toString());
        url.searchParams.set('start', '0');
        url.searchParams.set('limit', SEARCH_LIMIT.toString());

        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
            Logger.error(new Error('Token search API error'), { chainId, query, status: response.status });
            return [];
        }

        const { content } = (await response.json()) as TokenSearchApiResponse;
        return content.map(token => ({
            label: token.name,
            pathname: '/address/' + token.address,
            value: [token.name, token.symbol, token.address],
        }));
    } catch (error) {
        Logger.error(new Error('Token search request failed', { cause: error }), { chainId, query });
        return [];
    } finally {
        clearTimeout(timeoutId);
    }
}
