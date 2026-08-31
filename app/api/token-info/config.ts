// Configuration for the token-info route. Note: the Next.js route segment config
// (`maxDuration`) stays in route.ts — Next only reads those as literal exports of
// the route module, not via re-export.

import { TOKEN_INFO_REQUEST_LIMIT } from '@entities/token-info/lib/request-limit';

/** How long a resolved token list stays fresh in the Next data cache. */
export const CACHE_MAX_AGE = 3600; // 1 hour

/**
 * Bounds one request, not the holdings list a page may show — the browser chunks a
 * longer list by this same value. Imported past the entity barrel because route specs
 * mock the barrel, and a mock omitting this would drop the cap to `undefined`.
 */
export const MAX_ADDRESSES = TOKEN_INFO_REQUEST_LIMIT;
