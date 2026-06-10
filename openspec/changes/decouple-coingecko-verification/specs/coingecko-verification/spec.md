## ADDED Requirements

### Requirement: Market data SHALL be served from a provider-agnostic route in a normalized shape

The system SHALL expose token market data at `GET /api/token-market-data/{address}` in a normalized, provider-agnostic shape — `{ price, priceChange24h?, marketCap?, volume24h?, marketCapRank, lastUpdated }` — so the price provider can be swapped without changing consumers. CoinGecko is the current backing implementation, and the upstream-to-wire mapping SHALL live in the route, not in the client. An address that is not a valid base-58 public key SHALL return `400`.

#### Scenario: Normalized response for a fully-populated token

- **WHEN** a client requests `/api/token-market-data/{validAddress}` and upstream returns full market data
- **THEN** the route SHALL respond `200` with `{ price, priceChange24h, marketCap, volume24h, marketCapRank, lastUpdated }` mapped from the upstream fields

#### Scenario: Invalid address

- **WHEN** the requested address is not a valid public key
- **THEN** the route SHALL respond `400` without calling upstream

### Requirement: Market data SHALL tolerate partial upstream data

The route MUST render whatever market fields are present rather than failing when optional fields are absent: `price` is the only required field, and `marketCap`, `volume24h`, and `priceChange24h` SHALL be omitted from the response when upstream lacks them (so the client renders only the tiles it has). A token exposing a price but no market cap or volume SHALL still return `200`, not `502`.

#### Scenario: Price-only token

- **WHEN** upstream returns a USD price but no market cap, volume, or 24h change
- **THEN** the route SHALL respond `200` with `price` set and `marketCap`/`volume24h`/`priceChange24h` omitted

#### Scenario: Unranked token

- **WHEN** upstream returns `market_cap_rank: null`
- **THEN** the response SHALL carry `marketCapRank: null` (the client coerces it to absent)

### Requirement: Absent USD price SHALL be a cacheable 404 distinct from verification

The route SHALL return `404 { error: 'No market data' }` when upstream returns no USD price (e.g. a token listed without trade data, returning empty currency maps), because there are no cards to render. This MUST NOT affect verification — market data and the verified badge are independent, so a token with no market data can still be verified.

#### Scenario: Listed token with no trade data

- **WHEN** upstream returns `200` with empty currency maps and no USD price
- **THEN** the route SHALL respond `404 { error: 'No market data' }`
- **AND** verification of the same token SHALL be unaffected

### Requirement: Market-data upstream failures SHALL map to stable status codes

The route SHALL map upstream conditions as: `429` upstream → `429` (reported to Sentry as a warning); `404` upstream → `404`; a request timeout → `504` with `ERROR_CACHE_HEADERS`; an unparseable success body → `502`; any other failure → `500`. Successful responses SHALL carry `CACHE_HEADERS`.

#### Scenario: Rate limited

- **WHEN** upstream responds `429`
- **THEN** the route SHALL respond `429` and emit a Sentry warning

#### Scenario: Upstream timeout

- **WHEN** the upstream request times out
- **THEN** the route SHALL respond `504` with `ERROR_CACHE_HEADERS` (`public, max-age=30, s-maxage=30`)

#### Scenario: Malformed success body

- **WHEN** upstream returns `200` with a body that has a USD price but fails the normalized schema
- **THEN** the route SHALL respond `502`

### Requirement: The market-data route SHALL be keyless-capable

The route MUST work without an API key: when `COINGECKO_API_KEY` is unset it SHALL call the public CoinGecko Coins endpoint (`api.coingecko.com`) with no key header; when set it SHALL call the Pro host (`pro-api.coingecko.com`) with `x-cg-pro-api-key`. The key SHALL be read inside the handler so it is configurable per environment.

#### Scenario: No key configured

- **WHEN** `COINGECKO_API_KEY` is unset
- **THEN** the route SHALL call `https://api.coingecko.com/api/v3/coins/solana/contract/...` with no `x-cg-pro-api-key` header

#### Scenario: Key configured

- **WHEN** `COINGECKO_API_KEY` is set
- **THEN** the route SHALL call `https://pro-api.coingecko.com/api/v3/coins/solana/contract/...` with the `x-cg-pro-api-key` header

### Requirement: The market-data hook SHALL fetch only when relevant and map the wire shape to stats

The `useTokenMarketData(address, isTokenMint)` hook SHALL request data only when the target is a token mint, the cluster is mainnet-beta, and the tab is visible (a null SWR key otherwise). It SHALL map the wire response to `TokenMarketStats` (ISO `lastUpdated` → `Date` or `undefined`; `null` `marketCapRank` → `undefined`), treat a `404` as a permanent `FetchFailed` (no retry), surface `429` as `RateLimited`, and report `Loading`/`Success`/`FetchFailed` states.

#### Scenario: Gating

- **WHEN** the target is not a token mint, or the cluster is not mainnet-beta, or the tab is hidden
- **THEN** the hook SHALL NOT issue a fetch

#### Scenario: Permanent miss on 404

- **WHEN** the route responds `404`
- **THEN** the hook SHALL resolve to `FetchFailed` without retrying

#### Scenario: Successful mapping

- **WHEN** the route responds `200` with a normalized body
- **THEN** the hook SHALL resolve to `Success` with `stats` whose `lastUpdated` is a `Date` (or `undefined`) and `marketCapRank` is a number (or `undefined`)

<!-- CoinGecko verification (gt_verified) -->

### Requirement: CoinGecko verification SHALL be derived from `gt_verified`

The CoinGecko "verified" determination SHALL be derived from the on-chain token-info endpoint's `data.attributes.gt_verified` boolean, NOT from the presence of market data. The verification route at `GET /api/verification/coingecko/{address}` SHALL respond `{ coinGeckoId?, verified: <boolean> }`, where `verified` SHALL be `true` only when `gt_verified === true`, and `coinGeckoId` SHALL carry the upstream `data.attributes.coingecko_coin_id` (omitted from the response when it is `null` or absent). The `gt_score` field SHALL NOT be used as a threshold or surfaced.

#### Scenario: Verified token

- **WHEN** upstream returns `data.attributes.gt_verified === true`
- **THEN** the route SHALL respond `200 { verified: true }`

#### Scenario: Unverified or absent flag

- **WHEN** upstream returns `gt_verified` as `false` or omits it
- **THEN** the route SHALL respond `200 { verified: false }`

#### Scenario: Coin id passthrough

- **WHEN** upstream returns a non-null `data.attributes.coingecko_coin_id` (e.g. `usd-coin`)
- **THEN** the route SHALL echo it as `coinGeckoId` in the response
- **AND** when `coingecko_coin_id` is `null` or absent, the response SHALL omit `coinGeckoId`

### Requirement: Verification SHALL select host by key presence with an identical response schema

The route MUST resolve the verified flag with or without an API key: when `COINGECKO_API_KEY` is set it SHALL call CoinGecko Pro (`https://pro-api.coingecko.com/api/v3/onchain/networks/solana/tokens/{address}/info`) with the `x-cg-pro-api-key` header; when unset it SHALL fall back to the public, keyless GeckoTerminal endpoint (`https://api.geckoterminal.com/api/v2/networks/solana/tokens/{address}/info`) with no auth header. Both hosts return an identical `{ data: { attributes: { gt_verified, coingecko_coin_id } } }` shape, so a single schema SHALL validate either. The key SHALL be read inside the handler.

#### Scenario: Pro host when keyed

- **WHEN** `COINGECKO_API_KEY` is set
- **THEN** the route SHALL call the `pro-api.coingecko.com/api/v3/onchain/...` URL with the `x-cg-pro-api-key` header

#### Scenario: Keyless fallback when no key

- **WHEN** `COINGECKO_API_KEY` is unset
- **THEN** the route SHALL call the `api.geckoterminal.com/api/v2/networks/...` URL with no `x-cg-pro-api-key` header and still resolve `verified` from `gt_verified`

### Requirement: Verification SHALL be decoupled from market data

The verified badge MUST NOT depend on the presence of market-data cards. A token that is `gt_verified` but has no tradable market data SHALL still show the CoinGecko verified badge (without price cards), and a token with market data that is not `gt_verified` SHALL NOT show it.

#### Scenario: Verified without market data

- **WHEN** a token is `gt_verified === true` but the market-data route returns `404`
- **THEN** the CoinGecko verified badge SHALL still be shown, with no market-data cards

#### Scenario: Market data without verification

- **WHEN** a token returns market data but is not `gt_verified`
- **THEN** the CoinGecko verified badge SHALL NOT be shown

### Requirement: The CoinGecko badge link SHALL resolve to the coin page or GeckoTerminal fallback

The CoinGecko verification source URL SHALL be built from the `coinGeckoId` returned by the verification route: when a `coinGeckoId` is present it SHALL link to the CoinGecko coin page `https://www.coingecko.com/en/coins/{coinGeckoId}`; when absent it SHALL fall back to the GeckoTerminal token page `https://www.geckoterminal.com/solana/tokens/{address}`. The legacy `/coins/solana/contract/{address}` path MUST NOT be used, as it 404s on coingecko.com.

#### Scenario: Listed token links to its coin page

- **WHEN** the verification route resolves `{ coinGeckoId: 'usd-coin', verified: true }`
- **THEN** the CoinGecko source URL SHALL be `https://www.coingecko.com/en/coins/usd-coin`

#### Scenario: Unlisted token falls back to GeckoTerminal

- **WHEN** the verification route resolves a result with no `coinGeckoId`
- **THEN** the CoinGecko source URL SHALL be `https://www.geckoterminal.com/solana/tokens/{address}`

### Requirement: Verification upstream failures SHALL map to stable status codes

The route SHALL map upstream conditions consistent with the other verification sources: `429` → `429` (Sentry warning); `404` → `404`; a request timeout → `504` with `ERROR_CACHE_HEADERS`; an unparseable body → `502`; any other failure → `500`. A successful determination SHALL carry `CACHE_HEADERS`. An invalid (non-public-key) address SHALL return `400`.

#### Scenario: Rate limited

- **WHEN** upstream responds `429`
- **THEN** the route SHALL respond `429` and emit a Sentry warning

#### Scenario: Timeout

- **WHEN** the upstream request times out
- **THEN** the route SHALL respond `504` with `ERROR_CACHE_HEADERS`

#### Scenario: Schema mismatch

- **WHEN** upstream returns `200` with a body that does not match the verification schema
- **THEN** the route SHALL respond `502`

### Requirement: The verification hook SHALL expose verified state and gate fetching

The `useCoinGeckoVerification(address, enabled)` hook SHALL return `{ coinGeckoId?, verified, status }` and request data only when enabled, the cluster is mainnet-beta, and the tab is visible. A `404` SHALL resolve to `{ status: FetchFailed, verified: false }` without retry; `429` SHALL surface as `RateLimited`; a successful response SHALL resolve to `{ status: Success, verified, coinGeckoId }` (passing through the route's `coinGeckoId` when present). The verified-source derivation MUST treat a source as verified only when `status === Success && verified`, while still marking it "found" on any `Success`.

#### Scenario: Gating

- **WHEN** the hook is disabled, the cluster is not mainnet-beta, or the tab is hidden
- **THEN** the hook SHALL NOT issue a fetch

#### Scenario: Found but not verified

- **WHEN** the hook resolves `{ status: Success, verified: false }`
- **THEN** the CoinGecko source SHALL report `verified: false` but `isVerificationFound: true`
