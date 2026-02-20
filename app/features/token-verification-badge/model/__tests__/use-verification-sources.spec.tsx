import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FullLegacyTokenInfo, FullTokenInfo } from '@/app/utils/token-info';

import { EVerificationSource } from '../../lib/types';
import { BlupryntStatus, useBluprynt } from '../use-bluprynt';
import { CoingeckoStatus, useCoinGecko } from '../use-coingecko';
import { JupiterStatus, useJupiterVerification } from '../use-jupiter';
import { RugCheckStatus, useRugCheck } from '../use-rugcheck';
import { useTokenVerification } from '../use-verification-sources';

vi.mock('../use-bluprynt', async importOriginal => {
    const original = await importOriginal<typeof import('../use-bluprynt')>();
    return {
        ...original,
        useBluprynt: vi.fn(),
    };
});

vi.mock('../use-coingecko', async importOriginal => {
    const original = await importOriginal<typeof import('../use-coingecko')>();
    return {
        ...original,
        useCoinGecko: vi.fn(),
    };
});

vi.mock('../use-jupiter', async importOriginal => {
    const original = await importOriginal<typeof import('../use-jupiter')>();
    return {
        ...original,
        useJupiterVerification: vi.fn(),
    };
});

vi.mock('../use-rugcheck', async importOriginal => {
    const original = await importOriginal<typeof import('../use-rugcheck')>();
    return {
        ...original,
        useRugCheck: vi.fn(),
    };
});

const tokenInfo: FullTokenInfo = {
    address: 'token-address',
    chainId: 101,
    decimals: 6,
    extensions: { coingeckoId: 'token-id' },
    name: 'Test Token',
    symbol: 'TEST',
    verified: true,
};

describe('useTokenVerification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useBluprynt).mockReturnValue(undefined);
        vi.mocked(useCoinGecko).mockReturnValue(undefined);
        vi.mocked(useJupiterVerification).mockReturnValue(undefined);
        vi.mocked(useRugCheck).mockReturnValue(undefined);
    });

    it('aggregates verification sources and derived source lists', () => {
        vi.mocked(useBluprynt).mockReturnValue({
            status: BlupryntStatus.Success,
            verified: true,
        });
        vi.mocked(useCoinGecko).mockReturnValue({
            status: CoingeckoStatus.Success,
        });
        vi.mocked(useJupiterVerification).mockReturnValue({
            status: JupiterStatus.Success,
            verified: false,
        });
        vi.mocked(useRugCheck).mockReturnValue({
            score: 70,
            status: RugCheckStatus.Success,
        });

        const { result } = renderHook(() => useTokenVerification(tokenInfo));

        expect(result.current.isLoading).toBe(false);
        expect(result.current.sources).toHaveLength(5);
        expect(result.current.verificationFoundSources.map(source => source.name)).toEqual([
            EVerificationSource.Bluprynt,
            EVerificationSource.CoinGecko,
            EVerificationSource.Jupiter,
            EVerificationSource.Solflare,
            EVerificationSource.RugCheck,
        ]);
        expect(result.current.verifiedSources.map(source => source.name)).toEqual([
            EVerificationSource.Bluprynt,
            EVerificationSource.CoinGecko,
            EVerificationSource.Solflare,
            EVerificationSource.RugCheck,
        ]);
        expect(result.current.unverifiedSources.map(source => source.name)).toEqual([EVerificationSource.Jupiter]);
    });

    it('reports loading when an applicable source is loading', () => {
        vi.mocked(useBluprynt).mockReturnValue({
            status: BlupryntStatus.Loading,
            verified: false,
        });

        const { result } = renderHook(() => useTokenVerification(tokenInfo));

        expect(result.current.isLoading).toBe(true);
    });

    it('ignores CoinGecko loading when token has no CoinGecko id', () => {
        const legacyTokenInfo: FullLegacyTokenInfo = {
            address: 'legacy-token-address',
            chainId: 101,
            decimals: 6,
            name: 'Legacy Token',
            symbol: 'LGCY',
        };

        vi.mocked(useCoinGecko).mockReturnValue({
            status: CoingeckoStatus.Loading,
        });
        vi.mocked(useJupiterVerification).mockReturnValue({
            status: JupiterStatus.FetchFailed,
            verified: false,
        });
        vi.mocked(useRugCheck).mockReturnValue({
            score: 0,
            status: RugCheckStatus.FetchFailed,
        });
        vi.mocked(useBluprynt).mockReturnValue({
            status: BlupryntStatus.NotFound,
            verified: false,
        });

        const { result } = renderHook(() => useTokenVerification(legacyTokenInfo));

        expect(result.current.isLoading).toBe(false);
    });
});
