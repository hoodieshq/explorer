import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { Cluster } from '@utils/cluster';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// next/navigation is used by OwnedTokensCard's display dropdown.
vi.mock('next/navigation', () => ({
    usePathname: vi.fn(() => '/address/x/tokens'),
    useSearchParams: vi.fn(() => ({ get: vi.fn(() => null), has: vi.fn(), toString: () => '' })),
}));

const { useAccountOwnedTokensMock, useFetchAccountOwnedTokensMock } = vi.hoisted(() => ({
    useAccountOwnedTokensMock: vi.fn(),
    useFetchAccountOwnedTokensMock: vi.fn(() => vi.fn()),
}));
vi.mock('@providers/accounts/tokens', () => ({
    useAccountOwnedTokens: useAccountOwnedTokensMock,
    useFetchAccountOwnedTokens: useFetchAccountOwnedTokensMock,
}));

const { useClusterMock } = vi.hoisted(() => ({ useClusterMock: vi.fn() }));
vi.mock('@providers/cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('@providers/cluster')>();
    return { ...actual, useCluster: useClusterMock };
});

// Keep the real deriveScaledUiAmountMultiplier, override only useTokenInfo so rows enrich from the batch path.
const { useTokenInfoMock } = vi.hoisted(() => ({ useTokenInfoMock: vi.fn() }));
vi.mock('@entities/token-info', async importOriginal => {
    const actual = await importOriginal<typeof import('@entities/token-info')>();
    return { ...actual, useTokenInfo: useTokenInfoMock };
});

// Stub Address so we can assert props without dragging in nickname/visibility/cluster-path machinery.
vi.mock('@components/common/Address', () => ({
    Address: ({ pubkey, fetchTokenLabelInfo, tokenLabelInfo }: any) => (
        <span
            data-testid="address"
            data-fetch-label={String(Boolean(fetchTokenLabelInfo))}
            data-has-token-label-info={String(tokenLabelInfo !== undefined)}
        >
            {pubkey.toBase58()}
        </span>
    ),
}));

// Stub ProxiedImage to echo the uri (or its absence) so we can assert the logo column and fallback branch.
vi.mock('@/app/features/metadata', () => ({
    ProxiedImage: ({ uri, alt }: any) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-testid="token-logo" data-uri={uri ?? ''} alt={alt} />
    ),
}));

import { OwnedTokensCard } from '../OwnedTokensCard';

const OWNER = '11111111111111111111111111111111';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const LOGO = 'https://example.test/usdc.png';

function makeEntry() {
    return {
        data: {
            tokens: [
                {
                    info: {
                        mint: new PublicKey(MINT),
                        tokenAmount: { amount: '1234560000', decimals: 6, uiAmountString: '1234.56' },
                    },
                    pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
                },
            ],
        },
        status: FetchStatus.Fetched,
    };
}

describe('should render OwnedTokensCard with lazy per-row enrichment', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    function setup() {
        useClusterMock.mockReturnValue({ cluster: Cluster.MainnetBeta, genesisHash: 'genesis', url: 'http://rpc' });
        useAccountOwnedTokensMock.mockReturnValue(makeEntry());
    }

    it('should render the symbol and logo from useTokenInfo and pass fetchTokenLabelInfo to the mint Address', () => {
        setup();
        useTokenInfoMock.mockReturnValue({
            address: MINT,
            decimals: 6,
            logoURI: LOGO,
            name: 'USD Coin',
            symbol: 'USDC',
        });

        render(<OwnedTokensCard address={OWNER} />);

        // Logo column always rendered, with the fetched uri.
        const logo = screen.getByTestId('token-logo');
        expect(logo.getAttribute('data-uri')).toBe(LOGO);
        // The row drives the lazy fetch for its own mint via useTokenInfo (fetch=true, correct mint + cluster).
        expect(useTokenInfoMock).toHaveBeenCalledWith(true, MINT, Cluster.MainnetBeta, 'genesis');
        // Symbol comes from useTokenInfo, rendered next to the amount in the balance cell.
        expect(screen.getByText('USDC', { exact: false })).toBeInTheDocument();
        // Mint Address is labeled from the row's already-fetched tokenInfo (tokenLabelInfo), no second fetch.
        const address = screen.getByTestId('address');
        expect(address.getAttribute('data-fetch-label')).toBe('false');
        expect(address.getAttribute('data-has-token-label-info')).toBe('true');
    });

    it('should still render the logo column with a fallback when token info is unavailable', () => {
        setup();
        useTokenInfoMock.mockReturnValue(undefined);

        render(<OwnedTokensCard address={OWNER} />);

        // The logo cell is present and the uri is empty, so ProxiedImage shows its Solana fallback.
        const logo = screen.getByTestId('token-logo');
        expect(logo.getAttribute('data-uri')).toBe('');
        // No symbol text when info is missing.
        expect(screen.queryByText('USDC')).not.toBeInTheDocument();
    });
});
