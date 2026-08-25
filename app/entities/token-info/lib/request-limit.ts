/**
 * How many distinct mints one `/api/token-info` request may carry.
 *
 * The route rejects a body naming more than this, and the browser splits longer
 * lists into chunks of this size, so the two must agree — `app/api/token-info/config.ts`
 * derives its `MAX_ADDRESSES` from this value rather than restating it.
 *
 * Kept in `lib/` with no imports of its own so both sides can read it: the client
 * fetcher pulls in browser code, and the route must not.
 *
 * The ceiling is ours, not the upstream list's — UTL resolves 1051 addresses in one
 * ~0.4s call. It bounds the on-chain Metaplex fallback instead, which `includeOnChainFallback`
 * callers pay for: that path makes two passes over the missing mints, each chunked 100
 * keys at a time, so this value caps it at six RPC reads per request.
 */
export const TOKEN_INFO_REQUEST_LIMIT = 256;
