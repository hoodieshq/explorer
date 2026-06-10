import type { Infer } from 'superstruct';

import { TokenMarketDataSchema, type TokenMarketStats } from '../../lib/types';

// All three factories below describe the SAME canonical token in three shapes:
//   upstream (CoinGecko)  →  wire (route JSON / hook input)  →  domain (parsed stats)
// so a route test can assert createCoinGeckoMarketData() maps to createTokenMarketData(),
// and a hook test can assert createTokenMarketData() parses to createTokenMarketStats().
const CANONICAL = {
    lastUpdated: '2025-01-01T00:00:00Z',
    marketCap: 1_000_000,
    marketCapRank: 5,
    price: 1.23,
    priceChange24h: 0.67,
    volume24h: 500_000,
} as const;

/** Raw CoinGecko "Coins" contract-address response (upstream shape the route normalizes). */
export type CoinGeckoMarketDataOverrides = {
    last_updated?: unknown;
    market_cap_rank?: unknown;
    market_data?: unknown;
};

/**
 * Upstream CoinGecko response. `market_data` is replaced wholesale when overridden,
 * and overrides accept `unknown` so schema-failure cases (e.g. `last_updated: 12345`)
 * and partial-data cases (price-only, empty currency maps) can be expressed.
 */
export function createCoinGeckoMarketData(overrides: CoinGeckoMarketDataOverrides = {}): Record<string, unknown> {
    const { market_data, ...rest } = overrides;
    return {
        last_updated: CANONICAL.lastUpdated,
        market_cap_rank: CANONICAL.marketCapRank,
        market_data: market_data ?? {
            current_price: { eur: 0.92, usd: CANONICAL.price },
            market_cap: { usd: CANONICAL.marketCap },
            price_change_percentage_24h_in_currency: { usd: CANONICAL.priceChange24h },
            total_volume: { usd: CANONICAL.volume24h },
        },
        ...rest,
    };
}

type TokenMarketData = Infer<typeof TokenMarketDataSchema>;

/** Normalized wire shape the route emits and the hook fetches (matches `TokenMarketDataSchema`). */
export function createTokenMarketData(overrides: Partial<TokenMarketData> = {}): TokenMarketData {
    return { ...CANONICAL, ...overrides };
}

/** Parsed domain stats (`lastUpdated` as a `Date`) — what the hook returns and the UI consumes. */
export function createTokenMarketStats(overrides: Partial<TokenMarketStats> = {}): TokenMarketStats {
    return {
        lastUpdated: new Date(CANONICAL.lastUpdated),
        marketCap: CANONICAL.marketCap,
        marketCapRank: CANONICAL.marketCapRank,
        price: CANONICAL.price,
        priceChange24h: CANONICAL.priceChange24h,
        volume24h: CANONICAL.volume24h,
        ...overrides,
    };
}
