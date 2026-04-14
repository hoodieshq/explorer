import { PUBLIC_KEY_LENGTH } from '@solana/web3.js';
import bs58 from 'bs58';
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { array, boolean, is, nullable, number, optional, string, type } from 'superstruct';

import { matchAbortError } from '@/app/api/metadata/proxy/feature/errors';
import { NO_STORE_HEADERS } from '@/app/api/verification/config';
import { getAssetBatch } from '@/app/entities/das/helius-das-adapter';
import type { DasAsset } from '@/app/entities/das/types';
import { UTL_API_BASE_URL } from '@/app/entities/token-info/env';
import { Logger } from '@/app/shared/lib/logger';
import { Cluster, clusterFromSlug } from '@/app/utils/cluster';

const SEARCH_CACHE_REVALIDATE_S = 30;
const SEARCH_CACHE_HEADERS = {
    'Cache-Control': `public, s-maxage=${SEARCH_CACHE_REVALIDATE_S}, stale-while-revalidate=${SEARCH_CACHE_REVALIDATE_S * 2}`,
};

const DISCOVERY_TIMEOUT_MS = 3_000;
const ENRICHMENT_TIMEOUT_MS = 2_000;
const SEARCH_TOKENS_LIMIT = 20;
const SEARCH_QUERY_MAX_LENGTH = 200;

// --- Superstruct schemas ---

const JupiterTokenSchema = type({
    decimals: optional(number()),
    id: string(),
    isVerified: optional(boolean()),
    logoURI: optional(nullable(string())),
    name: string(),
    symbol: string(),
});

const JupiterSearchResponseSchema = array(JupiterTokenSchema);

const UtlTokenSchema = type({
    address: string(),
    decimals: optional(number()),
    logoURI: optional(nullable(string())),
    name: string(),
    symbol: string(),
});

const UtlSearchResponseSchema = type({
    content: array(UtlTokenSchema),
});

// --- Types ---

type DiscoveredToken = {
    address: string;
    decimals: number | null;
    isVerified: boolean;
    logoUri: string | null;
    name: string;
    symbol: string;
};

type NormalizedToken = {
    decimals: number | null;
    icon: string | null;
    isVerified: boolean;
    name: string;
    ticker: string;
    tokenAddress: string;
};

// --- Discovery ---

async function discoverWithJupiter(query: string, signal: AbortSignal): Promise<DiscoveredToken[] | null> {
    const jupiterApiKey = process.env.JUPITER_API_KEY;
    if (!jupiterApiKey) {
        Logger.warn('[api:search] JUPITER_API_KEY is not configured — skipping Jupiter discovery');
        return null;
    }

    try {
        const url = `https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'x-api-key': jupiterApiKey,
            },
            signal,
        });

        if (!response.ok) {
            if (response.status === 429) {
                Logger.warn('[api:search] Jupiter rate limit exceeded', { sentry: true });
            } else {
                Logger.warn(`[api:search] Jupiter returned ${response.status}`, { sentry: true });
            }
            return null;
        }

        const data = await response.json();
        if (!is(data, JupiterSearchResponseSchema)) return null;

        return data.map(item => ({
            address: item.id,
            decimals: item.decimals ?? null,
            isVerified: item.isVerified === true,
            logoUri: item.logoURI ?? null,
            name: item.name,
            symbol: item.symbol,
        }));
    } catch (error) {
        if (!matchAbortError(error)) {
            Logger.error(error instanceof Error ? error : new Error('[api:search] Jupiter discovery failed'), {
                sentry: true,
            });
        }
        return null;
    }
}

async function discoverWithUtl(query: string, signal: AbortSignal): Promise<DiscoveredToken[]> {
    try {
        const url = `${UTL_API_BASE_URL}/v1/search?query=${encodeURIComponent(query)}&chainId=101&limit=${SEARCH_TOKENS_LIMIT}`;
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal,
        });

        if (!response.ok) {
            Logger.warn(`[api:search] UTL returned ${response.status}`, { sentry: true });
            return [];
        }

        const data = await response.json();
        if (!is(data, UtlSearchResponseSchema)) return [];

        return data.content.map(t => ({
            address: t.address,
            decimals: t.decimals ?? null,
            isVerified: false,
            logoUri: t.logoURI ?? null,
            name: t.name,
            symbol: t.symbol,
        }));
    } catch (error) {
        if (!matchAbortError(error)) {
            Logger.error(error instanceof Error ? error : new Error('[api:search] UTL fallback failed'), {
                sentry: true,
            });
        }
        return [];
    }
}

// --- Enrichment ---

function buildIconMap(assets: DasAsset[]): Map<string, string | null> {
    return new Map(assets.map(a => [a.id, a.content.links?.image ?? null]));
}

// --- Normalization ---

function normalizeTokens(discovered: DiscoveredToken[], iconMap: Map<string, string | null>): NormalizedToken[] {
    return discovered.map(t => ({
        decimals: t.decimals,
        icon: t.logoUri ?? iconMap.get(t.address) ?? null,
        isVerified: t.isVerified,
        name: t.name,
        ticker: t.symbol,
        tokenAddress: t.address,
    }));
}

// --- Query type detection ---

function detectQueryType(query: string): 'address' | 'text' {
    try {
        const decoded = bs58.decode(query);
        return decoded.length === PUBLIC_KEY_LENGTH ? 'address' : 'text';
    } catch {
        return 'text';
    }
}

// --- Cached resolution ---
//
// unstable_cache deduplicates concurrent server-side requests for the same
// (query, cluster) pair and keeps the result for SEARCH_CACHE_REVALIDATE_S
// seconds in the Next.js data cache.
//
// Migration note: when moving to Next 15, replace this with
//   fetch(jupiterUrl, { next: { revalidate: SEARCH_CACHE_REVALIDATE_S, tags: ['search'] } })
// inside discoverWithJupiter/discoverWithUtl. The keyParts prefix 'api-search'
// and the function args (query, cluster) already form the right cache-key shape.
const resolveSearchTokens = unstable_cache(
    // _cluster is always 'mainnet-beta'; non-mainnet is short-circuited before this call.
    // It is included only so the cache key shape is correct for a future multi-cluster extension.
    async (query: string, _cluster: string): Promise<NormalizedToken[]> => {
        // --- Discovery (3s budget) ---
        const discoveryController = new AbortController();
        const discoveryTimeout = setTimeout(() => discoveryController.abort(), DISCOVERY_TIMEOUT_MS);

        let discovered: DiscoveredToken[];
        try {
            const jupiterResults = await discoverWithJupiter(query, discoveryController.signal);
            if (jupiterResults !== null) {
                discovered = jupiterResults.slice(0, SEARCH_TOKENS_LIMIT);
            } else {
                // Jupiter unavailable — fall back to UTL (degraded: no address search, curated list only)
                discovered = await discoverWithUtl(query, discoveryController.signal);
            }
        } finally {
            clearTimeout(discoveryTimeout);
        }

        if (discovered.length === 0) return [];

        // --- Enrichment (2s budget) ---
        const enrichmentController = new AbortController();
        const enrichmentTimeout = setTimeout(() => enrichmentController.abort(), ENRICHMENT_TIMEOUT_MS);

        let iconMap = new Map<string, string | null>();
        try {
            const assets = await getAssetBatch(
                discovered.map(t => t.address),
                enrichmentController.signal,
            );
            if (assets) {
                iconMap = buildIconMap(assets);
            }
        } finally {
            clearTimeout(enrichmentTimeout);
        }

        return normalizeTokens(discovered, iconMap);
    },
    ['api-search'], // static key prefix; (query, cluster) args are appended automatically
    { revalidate: SEARCH_CACHE_REVALIDATE_S, tags: ['search'] },
);

// --- Handler ---

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? searchParams.get('query') ?? '';
    const clusterParam = searchParams.get('cluster') ?? 'mainnet-beta';

    const trimmed = query.trim();

    if (!trimmed) {
        return NextResponse.json(
            { meta: { total: 0 }, query: '', queryType: 'text', results: { tokens: [] }, success: true },
            { headers: NO_STORE_HEADERS },
        );
    }

    if (trimmed.length > SEARCH_QUERY_MAX_LENGTH) {
        return NextResponse.json(
            { meta: { total: 0 }, query: trimmed, queryType: 'text', results: { tokens: [] }, success: true },
            { headers: NO_STORE_HEADERS },
        );
    }

    const cluster = clusterFromSlug(clusterParam) ?? Cluster.MainnetBeta;

    if (cluster !== Cluster.MainnetBeta) {
        return NextResponse.json(
            {
                meta: { total: 0 },
                query: trimmed,
                queryType: detectQueryType(trimmed),
                results: { tokens: [] },
                success: true,
            },
            { headers: NO_STORE_HEADERS },
        );
    }

    const queryType = detectQueryType(trimmed);
    const tokens = await resolveSearchTokens(trimmed, clusterParam);

    return NextResponse.json(
        { meta: { total: tokens.length }, query: trimmed, queryType, results: { tokens }, success: true },
        { headers: SEARCH_CACHE_HEADERS },
    );
}
