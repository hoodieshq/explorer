import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FullTokenInfo } from '@/app/utils/token-info';

import { EVerificationSource } from '../../lib/types';
import { BlupryntStatus, useBlupryntVerification } from '../use-bluprynt';
import { CoingeckoStatus, useCoinGeckoVerification } from '../use-coingecko';
import { JupiterStatus, useJupiterVerification } from '../use-jupiter';
import { RugCheckStatus, useRugCheckVerification } from '../use-rugcheck';
import { useTokenVerification } from '../use-verification-sources';

vi.mock('../use-bluprynt', async importOriginal => {
    const original = await importOriginal<typeof import('../use-bluprynt')>();
    return {
        ...original,
        useBlupryntVerification: vi.fn(),
    };
});

vi.mock('../use-coingecko', async importOriginal => {
    const original = await importOriginal<typeof import('../use-coingecko')>();
    return {
        ...original,
        useCoinGeckoVerification: vi.fn(),
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
        useRugCheckVerification: vi.fn(),
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
        vi.mocked(useBlupryntVerification).mockReturnValue(undefined);
        vi.mocked(useCoinGeckoVerification).mockReturnValue(undefined);
        vi.mocked(useJupiterVerification).mockReturnValue(undefined);
        vi.mocked(useRugCheckVerification).mockReturnValue(undefined);
    });

    it('aggregates verification sources and derived source lists', () => {
        vi.mocked(useBlupryntVerification).mockReturnValue({
            status: BlupryntStatus.Success,
            verified: true,
        });
        vi.mocked(useCoinGeckoVerification).mockReturnValue({
            status: CoingeckoStatus.Success,
        });
        vi.mocked(useJupiterVerification).mockReturnValue({
            status: JupiterStatus.Success,
            verified: false,
        });
        vi.mocked(useRugCheckVerification).mockReturnValue({
            score: 70,
            status: RugCheckStatus.Success,
        });

        const { result } = renderHook(() => useTokenVerification(tokenInfo));

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
        expect(result.current.sourcesToApply).toHaveLength(0);
    });
});
