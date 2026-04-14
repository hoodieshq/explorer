import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenSearchProvider } from '../token-search-provider';
import { createSearchContext } from './provider-test-utils';

const ctx = createSearchContext();

const TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';

function makeApiResponse(tokens: object[] = [makeToken()]) {
    return new Response(
        JSON.stringify({
            meta: { total: tokens.length },
            query: 'sol',
            queryType: 'text',
            results: { tokens },
            success: true,
        }),
    );
}

function makeToken(overrides: Record<string, unknown> = {}) {
    return {
        decimals: 9,
        icon: 'https://example.com/sol.png',
        isVerified: true,
        name: 'Wrapped SOL',
        ticker: 'SOL',
        tokenAddress: TOKEN_ADDRESS,
        ...overrides,
    };
}

beforeEach(() => {
    // Clear the module-level cache between tests by resetting fetch and advancing time
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Reset env
    delete process.env.NEXT_PUBLIC_DISABLE_TOKEN_SEARCH;
});

describe('tokenSearchProvider', () => {
    it('should have kind "remote"', () => {
        expect(tokenSearchProvider.kind).toBe('remote');
    });

    it('should return [] for empty query', async () => {
        const result = await tokenSearchProvider.search('', ctx);
        expect(result).toEqual([]);
    });

    it('should return [] for whitespace-only query', async () => {
        const result = await tokenSearchProvider.search('   ', ctx);
        expect(result).toEqual([]);
    });

    it('should return [] when NEXT_PUBLIC_DISABLE_TOKEN_SEARCH is set', async () => {
        process.env.NEXT_PUBLIC_DISABLE_TOKEN_SEARCH = '1';
        const result = await tokenSearchProvider.search('sol', ctx);
        expect(result).toEqual([]);
    });

    it('should return a Tokens section on success', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeApiResponse());

        const result = await tokenSearchProvider.search('sol-unique-1', ctx);

        expect(result).toEqual([
            {
                label: 'Tokens',
                options: [
                    {
                        icon: 'https://example.com/sol.png',
                        label: 'SOL - Wrapped SOL',
                        pathname: '/address/' + TOKEN_ADDRESS,
                        value: ['Wrapped SOL', 'SOL', TOKEN_ADDRESS],
                        verified: true,
                    },
                ],
            },
        ]);
    });

    it('should return [] when the token list is empty', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeApiResponse([]));

        const result = await tokenSearchProvider.search('sol-unique-2', ctx);
        expect(result).toEqual([]);
    });

    it('should return [] when fetch throws', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'));

        const result = await tokenSearchProvider.search('sol-unique-3', ctx);
        expect(result).toEqual([]);
    });

    it('should return [] when response is not ok', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

        const result = await tokenSearchProvider.search('sol-unique-4', ctx);
        expect(result).toEqual([]);
    });

    it('should return [] when response shape is invalid', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ unexpected: true })));

        const result = await tokenSearchProvider.search('sol-unique-5', ctx);
        expect(result).toEqual([]);
    });

    it('should set icon to undefined when token has no icon', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeApiResponse([makeToken({ icon: null })]));

        const result = await tokenSearchProvider.search('sol-unique-6', ctx);
        expect(result[0].options[0].icon).toBeUndefined();
    });

    it('should cache results and not call fetch again for the same query', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeApiResponse());

        const query = 'cache-test-query-' + Date.now();
        await tokenSearchProvider.search(query, ctx);
        await tokenSearchProvider.search(query, ctx);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should call fetch independently for different queries', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeApiResponse());

        const ts = Date.now();
        await tokenSearchProvider.search('query-a-' + ts, ctx);
        await tokenSearchProvider.search('query-b-' + ts, ctx);

        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should refetch after cache TTL expires', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeApiResponse());

        const query = 'ttl-test-' + Date.now();
        await tokenSearchProvider.search(query, ctx);

        // Advance past the 30s TTL
        vi.advanceTimersByTime(31_000);

        await tokenSearchProvider.search(query, ctx);

        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
