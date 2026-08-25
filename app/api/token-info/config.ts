// Configuration for the token-info route. Note: the Next.js route segment config
// (`maxDuration`) stays in route.ts — Next only reads those as literal exports of
// the route module, not via re-export.

/** How long a resolved token list stays fresh in the Next data cache. */
export const CACHE_MAX_AGE = 3600; // 1 hour

/**
 * Caps how many distinct mints one request may resolve, so no caller fans out an
 * unbounded number of RPC lookups.
 *
 * This is not a cap on how many mints a page may show. Holdings lists are unbounded
 * since the 100-token cap was lifted — one address in HOO-974 holds 1051 mints — and
 * the browser splits a longer list into requests of this size, so the cap bounds one
 * request rather than the list. The entity owns the value and the client chunks by it,
 * so this reads it back rather than restating it and letting the two drift.
 *
 * Imported from `lib/` rather than the entity's `server.ts` barrel deliberately: the
 * barrel is mocked by route specs, and a mock that omits this would silently resolve the
 * cap to `undefined` and stop enforcing it. `lib/request-limit` has no imports of its own.
 */
import { TOKEN_INFO_REQUEST_LIMIT } from '@entities/token-info/lib/request-limit';

export const MAX_ADDRESSES = TOKEN_INFO_REQUEST_LIMIT;
