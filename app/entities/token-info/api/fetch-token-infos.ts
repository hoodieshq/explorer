import { Cluster } from '@utils/cluster';
import { fetchTokenInfosFromApi } from '@utils/token-info';

import { TOKEN_INFO_REQUEST_LIMIT } from '../lib/request-limit';
import type { TokenInfo } from '../lib/types';

/**
 * Resolves every mint in a holdings list, keyed by address.
 *
 * Unlike the per-row lookup behind `useTokenInfo`, this resolves the whole list at
 * once, because a mint cannot be sorted by verification until its metadata is known.
 * The cost stays proportional: a 20-mint account issues one request for 20 addresses,
 * the same request the per-row path already makes.
 *
 * Mints the UTL list does not carry are absent from the returned map. That is the
 * answer callers need — an unlisted mint sorts last and renders without a symbol —
 * so the route's on-chain Metaplex fallback stays off, sparing several RPC reads per
 * chunk for data that would not change the order.
 */
export async function fetchTokenInfos(
    addresses: readonly string[],
    cluster: Cluster,
    genesisHash?: string,
): Promise<Map<string, TokenInfo>> {
    const unique = Array.from(new Set(addresses));

    const chunks: string[][] = [];
    for (let start = 0; start < unique.length; start += TOKEN_INFO_REQUEST_LIMIT) {
        chunks.push(unique.slice(start, start + TOKEN_INFO_REQUEST_LIMIT));
    }

    // Per chunk, not all-or-nothing: `fetchTokenInfosFromApi` resolves to `undefined`
    // on failure rather than throwing, so one bad chunk leaves its mints unresolved —
    // they sort as unknown, which is the order they would have had anyway — while the
    // rest of the list still gets its symbols and tiers.
    const results = await Promise.all(chunks.map(chunk => fetchTokenInfosFromApi(chunk, cluster, genesisHash, false)));

    const byAddress = new Map<string, TokenInfo>();
    for (const tokens of results) {
        for (const token of tokens ?? []) {
            byAddress.set(token.address, token);
        }
    }

    return byAddress;
}
