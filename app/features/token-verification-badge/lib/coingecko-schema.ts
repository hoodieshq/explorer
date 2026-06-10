import { boolean, nullable, optional, string, type } from 'superstruct';

// On-chain token-info response (gt_verified). Same shape from both hosts:
//   CoinGecko Pro:  https://docs.coingecko.com/reference/token-info-contract-address
//   GeckoTerminal:  https://apiguide.geckoterminal.com/ (keyless)
// `coingecko_coin_id` is the canonical CoinGecko slug (e.g. 'usd-coin') used to
// build the web coin page link; null when the token isn't listed on coingecko.com.
export const CoinGeckoVerificationSchema = type({
    data: type({
        attributes: type({
            coingecko_coin_id: optional(nullable(string())),
            gt_verified: optional(boolean()),
        }),
    }),
});
