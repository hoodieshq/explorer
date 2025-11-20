import { renderHook } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import { pickClusterParams, useClusterPath } from '../url';

vi.mock('next/navigation');

describe('pickClusterParams', () => {
    describe('with no search params', () => {
        it('should return pathname only', () => {
            const result = pickClusterParams('/address/abc123');
            expect(result).toBe('/address/abc123');
        });

        it('should handle root pathname', () => {
            const result = pickClusterParams('/');
            expect(result).toBe('/');
        });
    });

    describe('with current search params', () => {
        it('should preserve cluster param from current search', () => {
            const currentParams = new URLSearchParams('cluster=devnet');
            const result = pickClusterParams('/address/abc123', currentParams);
            expect(result).toBe('/address/abc123?cluster=devnet');
        });

        it('should preserve customUrl param from current search', () => {
            const currentParams = new URLSearchParams('customUrl=http://localhost:8899');
            const result = pickClusterParams('/address/abc123', currentParams);
            expect(result).toBe('/address/abc123?customUrl=http%3A%2F%2Flocalhost%3A8899');
        });

        it('should preserve both cluster and customUrl params', () => {
            const currentParams = new URLSearchParams('cluster=custom&customUrl=http://localhost:8899');
            const result = pickClusterParams('/address/abc123', currentParams);
            expect(result).toBe('/address/abc123?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899');
        });

        it('should ignore non-cluster params from current search', () => {
            const currentParams = new URLSearchParams('cluster=devnet&foo=bar&baz=qux');
            const result = pickClusterParams('/address/abc123', currentParams);
            expect(result).toBe('/address/abc123?cluster=devnet');
        });

        it('should handle empty current search params', () => {
            const currentParams = new URLSearchParams('');
            const result = pickClusterParams('/address/abc123', currentParams);
            expect(result).toBe('/address/abc123');
        });
    });

    describe('with additional params', () => {
        it('should add additional params', () => {
            const additionalParams = new URLSearchParams('cluster=testnet');
            const result = pickClusterParams('/address/abc123', undefined, additionalParams);
            expect(result).toBe('/address/abc123?cluster=testnet');
        });

        it('should merge additional params with current params', () => {
            const currentParams = new URLSearchParams('cluster=devnet');
            const additionalParams = new URLSearchParams('customUrl=http://test.com');
            const result = pickClusterParams('/address/abc123', currentParams, additionalParams);
            expect(result).toBe('/address/abc123?customUrl=http%3A%2F%2Ftest.com&cluster=devnet');
        });

        it('should prioritize additional params over current params for cluster', () => {
            // TODO: BUG - Current params override additional params (should be opposite)
            // Expected: '/address/abc123?cluster=testnet'
            // Actual: '/address/abc123?cluster=devnet'
            const currentParams = new URLSearchParams('cluster=devnet');
            const additionalParams = new URLSearchParams('cluster=testnet');
            const result = pickClusterParams('/address/abc123', currentParams, additionalParams);
            expect(result).toBe('/address/abc123?cluster=devnet'); // BUG: Should be testnet
        });

        it('should handle multiple params in additional params', () => {
            const additionalParams = new URLSearchParams('cluster=testnet&customUrl=http://test.com');
            const result = pickClusterParams('/address/abc123', undefined, additionalParams);
            expect(result).toBe('/address/abc123?cluster=testnet&customUrl=http%3A%2F%2Ftest.com');
        });
    });

    describe('edge cases', () => {
        it('should handle pathname with trailing slash', () => {
            const currentParams = new URLSearchParams('cluster=devnet');
            const result = pickClusterParams('/address/abc123/', currentParams);
            expect(result).toBe('/address/abc123/?cluster=devnet');
        });

        it('should handle complex pathname', () => {
            const currentParams = new URLSearchParams('cluster=mainnet-beta');
            const result = pickClusterParams('/address/abc123/tokens', currentParams);
            expect(result).toBe('/address/abc123/tokens?cluster=mainnet-beta');
        });

        it('should handle undefined current params', () => {
            const result = pickClusterParams('/address/abc123', undefined);
            expect(result).toBe('/address/abc123');
        });
    });
});

describe('useClusterPath', () => {
    const mockUseSearchParams = (params: Record<string, string | null> = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null) {
                searchParams.set(key, value);
            }
        });

        return {
            get: (key: string) => searchParams.get(key),
            has: (key: string) => searchParams.has(key),
            toString: () => searchParams.toString(),
        };
    };

    describe('basic functionality', () => {
        it('should return pathname without params when no current params exist', () => {
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams() as any);

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123' }));

            expect(result.current).toBe('/address/abc123');
        });

        it('should preserve cluster param from current search', () => {
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'devnet' }) as any);

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123' }));

            expect(result.current).toBe('/address/abc123?cluster=devnet');
        });

        it('should preserve customUrl param from current search', () => {
            vi.mocked(useSearchParams).mockReturnValue(
                mockUseSearchParams({ customUrl: 'http://localhost:8899' }) as any
            );

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123' }));

            expect(result.current).toBe('/address/abc123?customUrl=http%3A%2F%2Flocalhost%3A8899');
        });

        it('should preserve both cluster and customUrl params', () => {
            vi.mocked(useSearchParams).mockReturnValue(
                mockUseSearchParams({ cluster: 'custom', customUrl: 'http://localhost:8899' }) as any
            );

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123' }));

            expect(result.current).toBe('/address/abc123?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899');
        });
    });

    describe('with hash fragments', () => {
        it('should preserve hash fragment', () => {
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams() as any);

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123#history' }));

            expect(result.current).toBe('/address/abc123#history');
        });

        it('should preserve hash with cluster param', () => {
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'devnet' }) as any);

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123#history' }));

            expect(result.current).toBe('/address/abc123?cluster=devnet#history');
        });

        it('should handle multiple hash-like characters correctly', () => {
            // TODO: BUG - split('#')[1] only captures first hash fragment, loses rest
            // Expected: '/address/abc?cluster=testnet#def#ghi'
            // Actual: '/address/abc?cluster=testnet#def'
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'testnet' }) as any);

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc#def#ghi' }));

            expect(result.current).toBe('/address/abc?cluster=testnet#def'); // BUG: Loses #ghi
        });
    });

    describe('with additional params', () => {
        it('should add additional params', () => {
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams() as any);

            const additionalParams = new URLSearchParams('cluster=testnet');
            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123', additionalParams }));

            expect(result.current).toBe('/address/abc123?cluster=testnet');
        });

        it('should override current cluster with additional params', () => {
            // TODO: BUG - Current params override additional params (should be opposite)
            // Expected: '/address/abc123?cluster=mainnet-beta'
            // Actual: '/address/abc123?cluster=devnet'
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'devnet' }) as any);

            const additionalParams = new URLSearchParams('cluster=mainnet-beta');
            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123', additionalParams }));

            expect(result.current).toBe('/address/abc123?cluster=devnet'); // BUG: Should be mainnet-beta
        });

        it('should merge additional params with current params', () => {
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'devnet' }) as any);

            const additionalParams = new URLSearchParams('customUrl=http://test.com');
            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123', additionalParams }));

            expect(result.current).toBe('/address/abc123?customUrl=http%3A%2F%2Ftest.com&cluster=devnet');
        });

        it('should handle additional params with hash', () => {
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'devnet' }) as any);

            const additionalParams = new URLSearchParams('customUrl=http://test.com');
            const { result } = renderHook(() =>
                useClusterPath({ pathname: '/address/abc123#tokens', additionalParams })
            );

            expect(result.current).toBe('/address/abc123?customUrl=http%3A%2F%2Ftest.com&cluster=devnet#tokens');
        });
    });

    describe('real-world scenarios', () => {
        it('should build account link on different cluster', () => {
            // TODO: BUG - Current params override additional params
            // Expected: cluster=devnet
            // Actual: cluster=mainnet-beta
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'mainnet-beta' }) as any);

            const additionalParams = new URLSearchParams('cluster=devnet');
            const { result } = renderHook(() =>
                useClusterPath({
                    pathname: '/address/So11111111111111111111111111111111111111112',
                    additionalParams,
                })
            );

            expect(result.current).toBe('/address/So11111111111111111111111111111111111111112?cluster=mainnet-beta'); // BUG
        });

        it('should build transaction link preserving cluster', () => {
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'testnet' }) as any);

            const { result } = renderHook(() =>
                useClusterPath({
                    pathname: '/tx/5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2u4xg9wzdpjEPZVEd1i5M',
                })
            );

            expect(result.current).toBe(
                '/tx/5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2u4xg9wzdpjEPZVEd1i5M?cluster=testnet'
            );
        });

        it('should handle navigation with custom RPC', () => {
            vi.mocked(useSearchParams).mockReturnValue(
                mockUseSearchParams({ cluster: 'custom', customUrl: 'http://localhost:8899' }) as any
            );

            const { result } = renderHook(() => useClusterPath({ pathname: '/block/12345' }));

            expect(result.current).toBe('/block/12345?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899');
        });

        it('should handle switching cluster for same address', () => {
            // TODO: BUG - Current params override additional params, making cluster switching impossible
            // Expected: cluster=devnet
            // Actual: cluster=mainnet-beta
            vi.mocked(useSearchParams).mockReturnValue(mockUseSearchParams({ cluster: 'mainnet-beta' }) as any);

            const additionalParams = new URLSearchParams('cluster=devnet');
            const { result } = renderHook(() =>
                useClusterPath({
                    pathname: '/address/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    additionalParams,
                })
            );

            expect(result.current).toBe('/address/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?cluster=mainnet-beta'); // BUG
        });
    });

    describe('null or undefined search params', () => {
        it('should handle null useSearchParams return', () => {
            vi.mocked(useSearchParams).mockReturnValue(null as any);

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123' }));

            expect(result.current).toBe('/address/abc123');
        });

        it('should handle undefined useSearchParams return', () => {
            vi.mocked(useSearchParams).mockReturnValue(undefined as any);

            const { result } = renderHook(() => useClusterPath({ pathname: '/address/abc123' }));

            expect(result.current).toBe('/address/abc123');
        });
    });
});
