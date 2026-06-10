import { nullable, number, optional, string, type } from 'superstruct';

export enum TokenMarketDataStatus {
    Success,
    FetchFailed,
    Loading,
    RateLimited,
}

export interface TokenMarketStats {
    price: number;
    priceChange24h?: number;
    marketCap?: number;
    volume24h?: number;
    marketCapRank?: number;
    lastUpdated?: Date;
}

export type TokenMarketDataResult = {
    stats?: TokenMarketStats;
    status: TokenMarketDataStatus;
};

// Client-side normalized response schema (server emits this exact shape).
// Optional/nullable everywhere except price so partial market data validates.
export const TokenMarketDataSchema = type({
    lastUpdated: nullable(string()),
    marketCap: optional(number()),
    marketCapRank: nullable(number()),
    price: number(),
    priceChange24h: optional(number()),
    volume24h: optional(number()),
});
