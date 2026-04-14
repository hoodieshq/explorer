import { clusterSlug } from '@utils/cluster';

import { Logger } from '@/app/shared/lib/logger';

import type { SearchContext, SearchOptions, SearchProvider } from '../lib/types';

const SEARCH_CACHE_TTL_MS = 30_000;
const SEARCH_CACHE_MAX_SIZE = 100;

type TokenSearchResult = {
    icon?: string | null;
    isVerified: boolean;
    name: string;
    ticker: string;
    tokenAddress: string;
};

const searchCache = new Map<string, { data: SearchOptions[]; expiresAt: number }>();

export const heliusSearchProvider: SearchProvider = {
    kind: 'remote',
    name: 'helius',
    priority: 100,
    async search(query: string, ctx: SearchContext): Promise<SearchOptions[]> {
        if (process.env.NEXT_PUBLIC_DISABLE_TOKEN_SEARCH || !query.trim()) {
            return [];
        }

        const trimmed = query.trim();
        const cacheKey = `${trimmed.toLowerCase()}|${clusterSlug(ctx.cluster)}`;
        const cached = searchCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        try {
            const params = new URLSearchParams({
                cluster: clusterSlug(ctx.cluster),
                q: trimmed,
            });

            const response = await fetch(`/api/search?${params}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });

            if (!response.ok) {
                Logger.warn('[helius-search] search error', {
                    query: trimmed,
                    status: response.status.toString(),
                });
                return [];
            }

            const data = await response.json();
            if (!data?.success || !data.results) {
                Logger.error(new Error('[helius-search] invalid search response'), { query: trimmed });
                return [];
            }

            const tokens: TokenSearchResult[] = data.results.tokens ?? [];
            const options = tokens.map(t => ({
                icon: t.icon ?? undefined,
                label: `${t.ticker} - ${t.name}`,
                pathname: '/address/' + t.tokenAddress,
                value: [t.name, t.ticker, t.tokenAddress],
                verified: t.isVerified,
            }));
            const sections: SearchOptions[] = options.length > 0 ? [{ label: 'Tokens', options }] : [];

            if (searchCache.size >= SEARCH_CACHE_MAX_SIZE) {
                const firstKey = searchCache.keys().next().value;
                if (firstKey !== undefined) searchCache.delete(firstKey);
            }
            searchCache.set(cacheKey, { data: sections, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
            return sections;
        } catch (error) {
            Logger.error(error instanceof Error ? error : new Error('[helius-search] request failed'), {
                query: trimmed,
            });
            return [];
        } finally {
            clearTimeout(timeoutId);
        }
    },
};
