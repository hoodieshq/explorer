import { Cluster } from '@utils/cluster';
import { fetchTokenInfosFromApi } from '@utils/token-info';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TOKEN_INFO_REQUEST_LIMIT } from '../../lib/request-limit';
import type { TokenInfo } from '../../lib/types';
import { fetchTokenInfos } from '../fetch-token-infos';

vi.mock('@utils/token-info', () => ({ fetchTokenInfosFromApi: vi.fn() }));

const mockedFetch = vi.mocked(fetchTokenInfosFromApi);

function tokenInfo(address: string, verified = true): TokenInfo {
    return { address, decimals: 6, logoURI: null, name: address, symbol: address, verified };
}

/** `n` distinct addresses, `addr-0` … `addr-(n-1)`. */
function addresses(n: number): string[] {
    return Array.from({ length: n }, (_, index) => `addr-${index}`);
}

describe('fetchTokenInfos', () => {
    beforeEach(() => {
        mockedFetch.mockReset();
        mockedFetch.mockResolvedValue([]);
    });

    it('should resolve a short list in a single request', async () => {
        mockedFetch.mockResolvedValue([tokenInfo('addr-0')]);

        const result = await fetchTokenInfos(addresses(20), Cluster.MainnetBeta);

        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(mockedFetch).toHaveBeenCalledWith(addresses(20), Cluster.MainnetBeta, undefined, false);
        expect(result.get('addr-0')).toEqual(tokenInfo('addr-0'));
    });

    it('should key the result by mint address', async () => {
        mockedFetch.mockResolvedValue([tokenInfo('addr-1', false), tokenInfo('addr-0', true)]);

        const result = await fetchTokenInfos(addresses(2), Cluster.MainnetBeta);

        expect(result.get('addr-0')?.verified).toBe(true);
        expect(result.get('addr-1')?.verified).toBe(false);
    });

    it('should omit mints the route did not resolve', async () => {
        mockedFetch.mockResolvedValue([tokenInfo('addr-0')]);

        const result = await fetchTokenInfos(addresses(3), Cluster.MainnetBeta);

        expect(result.size).toBe(1);
        expect(result.has('addr-1')).toBe(false);
    });

    it('should split a list longer than the request limit and merge the chunks', async () => {
        const all = addresses(TOKEN_INFO_REQUEST_LIMIT * 2 + 1);
        mockedFetch.mockImplementation(async chunk => chunk.map(address => tokenInfo(address)));

        const result = await fetchTokenInfos(all, Cluster.MainnetBeta);

        expect(mockedFetch).toHaveBeenCalledTimes(3);
        for (const call of mockedFetch.mock.calls) {
            expect(call[0].length).toBeLessThanOrEqual(TOKEN_INFO_REQUEST_LIMIT);
        }
        expect(result.size).toBe(all.length);
    });

    it('should keep the resolved chunks when another chunk fails', async () => {
        const all = addresses(TOKEN_INFO_REQUEST_LIMIT + 1);
        // The route resolves to `undefined` on failure rather than throwing.
        mockedFetch
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([tokenInfo(`addr-${TOKEN_INFO_REQUEST_LIMIT}`)]);

        const result = await fetchTokenInfos(all, Cluster.MainnetBeta);

        expect(result.size).toBe(1);
        expect(result.has(`addr-${TOKEN_INFO_REQUEST_LIMIT}`)).toBe(true);
    });

    it('should de-duplicate mints before chunking', async () => {
        await fetchTokenInfos(['a', 'b', 'a', 'b', 'a'], Cluster.MainnetBeta);

        expect(mockedFetch).toHaveBeenCalledWith(['a', 'b'], Cluster.MainnetBeta, undefined, false);
    });

    it('should forward the genesis hash', async () => {
        await fetchTokenInfos(['a'], Cluster.Custom, 'genesis-hash');

        expect(mockedFetch).toHaveBeenCalledWith(['a'], Cluster.Custom, 'genesis-hash', false);
    });

    it('should not call the route for an empty list', async () => {
        const result = await fetchTokenInfos([], Cluster.MainnetBeta);

        expect(mockedFetch).not.toHaveBeenCalled();
        expect(result.size).toBe(0);
    });

    it('should return an empty map when every chunk fails', async () => {
        mockedFetch.mockResolvedValue(undefined);

        const result = await fetchTokenInfos(addresses(5), Cluster.MainnetBeta);

        expect(result.size).toBe(0);
    });
});
