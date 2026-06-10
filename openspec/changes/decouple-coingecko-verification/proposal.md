# Proposal: Decouple token market data from CoinGecko and fix verification via `gt_verified`

## Context

A single CoinGecko fetch (`/api/verification/coingecko/{address}` → `GET /coins/solana/contract/{address}?market_data=true`) currently serves **two unrelated jobs**:

1. **Market-data cards** — Price / 24h Volume / Market Cap, legitimately from CoinGecko `market_data`.
2. **The "CoinGecko verified" badge** — inferred from *"did we get market data back?"* (`use-verification-sources.ts`: `coingeckoVerified = coinInfo?.status === Success`).

Job 2 is **semantically wrong**: being *indexed* by CoinGecko (has trade data) is not the same as being *verified*. The real signal is `gt_verified` (boolean) on CoinGecko's on-chain token-info endpoint. Two consequences follow:

- Tokens listed without trade data return 404 from the market-data fetch today and are therefore shown **not verified**, even when `gt_verified` is `true`.
- Market data is locked to the CoinGecko namespace (`api/verification/coingecko`, badge feature), so swapping the price provider later is hard.

## Why

The badge and the price cards have **independent lifecycles and data sources** but are welded to one fetch, which produces an incorrect verified set and blocks provider changes. Splitting them lets verification use the correct `gt_verified` signal while market data becomes a stable, provider-agnostic interface.

Alternatives considered:

- **Keep market-data presence as the verified signal** — rejected: it is the bug. Indexed ≠ verified, and it permanently mis-labels listed-without-trade-data tokens.
- **Keep the single existing route but make two upstream calls inside it** (Coins `market_data` + onchain `/info`, returning `{ …marketData, verified }`) — rejected: it fixes the *signal* but keeps the two concerns coupled at the route and client layers. It also couples failure modes (a 404/429/timeout on the market-data call would have to be merged into the verified response without dragging the badge down — exactly the partial-failure logic we'd rather not own), and leaves market data locked to the CoinGecko/verification namespace, defeating the provider-agnostic goal.
- **Read `gt_verified` from CoinGecko Pro only, returning 500 (badge hidden) when no key is set** — rejected: it leaves the badge dead on localhost/dev and any keyless deployment, so the "fix" delivers no visible benefit there. We **live-verified** that the public, keyless GeckoTerminal endpoint returns the **same** `data.attributes.gt_verified` (USDC → `true`), so we fall back to it when `COINGECKO_API_KEY` is unset. The deciding trade-off: the keyless tier is rate-limited to ~30 req/min, which is absorbed by the route's 4h edge cache (`s-maxage=14400`) + SWR dedupe + gated SWR key; a Pro key lifts the limit when present.
- **Threshold on `gt_score`** — rejected: the verified rule is `gt_verified === true` only; `gt_score` is not surfaced.

## What Changes

- **New provider-agnostic market-data feature** `app/features/token-market-data/` and route `/api/token-market-data/{address}` returning a **normalized, partial-data-resilient** shape (price required; market cap / volume / 24h-change / rank / last-updated optional). CoinGecko is the current implementation behind it; the market-data UI moves into the feature.
- **CoinGecko verification rewritten** at `/api/verification/coingecko/{address}` to return `{ coinGeckoId?, verified }` — `verified` from `data.attributes.gt_verified`, `coinGeckoId` from `data.attributes.coingecko_coin_id` (the CoinGecko coin slug, `null` when the token isn't listed on coingecko.com, omitted from the response when absent) — via `getCoinGeckoOnchainConfig`: CoinGecko Pro (`pro-api.coingecko.com/api/v3/onchain/...` + `x-cg-pro-api-key`) when keyed, else keyless GeckoTerminal (`api.geckoterminal.com/api/v2/networks/...`). One schema validates both (identical `{ data: { attributes: { gt_verified, coingecko_coin_id } } }`).
- **CoinGecko verified-badge link fixed.** The badge now links to the coin's web page `https://www.coingecko.com/en/coins/{coinGeckoId}` when a `coinGeckoId` is present, else falls back to the GeckoTerminal token page `https://www.geckoterminal.com/solana/tokens/{address}` (the source of the `gt_verified` signal). The legacy `/coins/solana/contract/{address}` link 404s on coingecko.com.
- **Shared HTTP helpers promoted** into `app/shared/lib/http-utils.ts` (`fetchUpstream`, `isTimeoutError`, cache-header constants); the per-feature `app/api/verification/upstream.ts` + `config.ts` are deleted and all importers rewired.
- **BREAKING (intended behavior change):** the verified set changes from "has market data" → `gt_verified`. Some tokens showing the badge today lose it; listed-without-trade-data `gt_verified` tokens gain it. A verified token with no market data now shows the badge without price cards.

## Capabilities

### New Capabilities
- `coingecko-verification`: the provider-agnostic token market-data route/feature (normalized shape, partial-data tolerance, keyless-capable CoinGecko backing, SWR hook + cards) **and** the CoinGecko "verified" badge driven by the real `gt_verified` signal (Pro-or-keyless host selection), decoupled from one another.

## Impact

- **New code** — `app/features/token-market-data/` (types, server-only upstream schema, SWR hook + cache config, relocated `TokenMarketData`/`MarketData` UI + stories); `app/api/token-market-data/[address]/route.ts`.
- **Rewritten** — `app/api/verification/coingecko/[address]/route.ts` (gt_verified + `coingecko_coin_id` + host selection); `app/features/token-verification-badge/model/use-coingecko.ts` (now `{ coinGeckoId?, verified, status }`); `app/features/token-verification-badge/lib/coingecko-schema.ts` + `server.ts` (verification schema adds `coingecko_coin_id`); `use-verification-sources.ts` (derive verified from `gt_verified`, not Success; build the coin-page/GeckoTerminal badge link from `coinGeckoId`); `app/components/Header.tsx` (uses the new market-data hook).
- **Moved/deleted** — market-data UI out of `app/components/common/`; `app/api/verification/upstream.ts` + `config.ts` deleted, helpers in `app/shared/lib/http-utils.ts`; importers (`jupiter`, `rugcheck`, `bluprynt` routes, `discover-with-jupiter.ts`) rewired.
- **Env / config** — `COINGECKO_API_KEY` (optional): when set, verification uses CoinGecko Pro onchain; when unset, verification falls back to keyless GeckoTerminal (~30 req/min) and market data uses the public Coins endpoint. No new required env.
- **Behavior** — verified-badge set changes (the fix); market data tolerates partial upstream data instead of 502-ing; no change to other verification sources (Jupiter / RugCheck / Bluprynt / Solflare).
- **Tests** — new route + hook specs for `token-market-data`; rewritten CoinGecko route/hook/sources specs; Storybook stories relocated. CI `pnpm openspec:validate` covers this change's well-formedness.
