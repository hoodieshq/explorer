import { Cluster } from '@utils/cluster';
import { fetchTokenInfosFromApi } from '@utils/token-info';

import { TOKEN_INFO_REQUEST_LIMIT } from '../lib/request-limit';
import type { TokenInfo } from '../lib/types';

/**
 * Resolves the whole list at once, because a mint cannot be ordered by verification
 * until its metadata is known. The on-chain fallback stays off: a mint the UTL list
 * does not carry is simply absent, and that absence is the answer callers need.
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

    // Per chunk, not all-or-nothing: a failed chunk resolves to `undefined` rather than
    // throwing, leaving its mints unresolved — which sorts them last, where they would
    // have sorted anyway — while the rest of the list still gets its symbols and tiers.
    const results = await Promise.all(chunks.map(chunk => fetchTokenInfosFromApi(chunk, cluster, genesisHash, false)));

    const byAddress = new Map<string, TokenInfo>();
    for (const tokens of results) {
        for (const token of tokens ?? []) {
            byAddress.set(token.address, token);
        }
    }

    return byAddress;
}
