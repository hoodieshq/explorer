import type { EditionInfo } from '@entities/nft';
import { some } from '@metaplex-foundation/umi';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MetaplexNFTHeader } from '@/app/components/account/MetaplexNFTHeader';
import { makeNftData } from '@/app/entities/nft/lib/__tests__/make-nft-data';

// REVIEW(HOO-921): the header variants under review. The specs below cover the primary one (Split) unless one picks
// another, with the creators kept in the header, where these specs read them.
const useNftHeaderVariant = vi.hoisted(() => vi.fn(() => 'split'));
vi.mock('@components/account/nft-header-variant', () => ({
    useNftHeaderVariant,
}));
vi.mock('@components/account/nft-creators-variant', async importOriginal => ({
    ...(await importOriginal<typeof import('@components/account/nft-creators-variant')>()),
    useNftCreatorsPlacement: () => 'header',
}));

vi.mock('@providers/cluster', () => ({
    useCluster: vi.fn(() => ({ cluster: 'mainnet-beta', url: 'https://api.mainnet-beta.solana.com' })),
}));

vi.mock('@utils/url', () => ({
    useClusterPath: vi.fn(({ pathname }: { pathname: string }) => pathname),
}));

vi.mock('@providers/accounts', () => ({
    isTokenProgramData: vi.fn(() => false),
    useAccountInfo: vi.fn(() => undefined),
    useFetchAccountInfo: vi.fn(() => vi.fn()),
    useMintAccountInfo: vi.fn(() => undefined),
}));

describe('MetaplexNFTHeader', () => {
    beforeEach(() => {
        useNftHeaderVariant.mockReturnValue('split');
    });

    it.each([
        { overrides: { name: 'Cool NFT #42' }, text: 'Cool NFT #42' },
        { overrides: { name: '' }, text: 'Unnamed NFT' },
        { overrides: { name: 'Cool NFT #42\0\0\0' }, text: 'Cool NFT #42' },
        { overrides: { name: '\0\0\0\0' }, text: 'Unnamed NFT' },
        { overrides: { symbol: 'MYSYM' }, text: 'MYSYM' },
        { overrides: { symbol: 'MYSYM\0\0\0\0\0' }, text: 'MYSYM' },
    ])('should render $text for $overrides', ({ overrides, text }) => {
        render(<MetaplexNFTHeader nftData={makeNftData(overrides)} />);
        expect(screen.getByText(text)).toBeDefined();
    });

    it.each([
        {
            editionInfo: { edition: undefined, masterEdition: { key: 6, maxSupply: some(100n), supply: 0n } },
            text: 'Master · 0 of 100 printed',
        },
        {
            editionInfo: {
                edition: { edition: 3n, key: 1, parent: '22222222222222222222222222222222' },
                masterEdition: { key: 6, maxSupply: some(100n), supply: 10n },
            },
            text: 'Print 3 of 100',
        },
    ])('should show the edition as $text', ({ editionInfo, text }) => {
        render(<MetaplexNFTHeader nftData={makeNftData({ editionInfo: editionInfo as unknown as EditionInfo })} />);
        expect(screen.getByText(text)).toBeDefined();
    });

    it('should show a dash for an empty symbol and for no edition without a master edition', () => {
        render(<MetaplexNFTHeader nftData={makeNftData({ symbol: '\0\0\0' })} />);
        const labels = screen.getAllByRole('term').map(term => term.textContent);
        const values = screen.getAllByRole('definition').map(value => value.textContent);
        expect(values[labels.indexOf('Symbol')]).toBe('—');
        expect(values[labels.indexOf('Edition')]).toBe('—');
    });
});

describe('MetaplexNFTHeader, Wide Art variant', () => {
    beforeEach(() => {
        useNftHeaderVariant.mockReturnValue('wideArt');
    });

    it('should list the fields with a dash for an empty symbol', () => {
        render(<MetaplexNFTHeader nftData={makeNftData({ name: 'Cool NFT #42', symbol: '\0\0\0' })} />);

        expect(screen.getByText('Cool NFT #42')).toBeInTheDocument();
        expect(screen.getByText('Symbol')).toBeInTheDocument();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
        expect(screen.getByText('Creators')).toBeInTheDocument();
    });

    it('should leave market and metadata to the Overview card', () => {
        render(<MetaplexNFTHeader nftData={makeNftData({ name: 'Cool NFT #42' })} />);

        expect(screen.queryByText('Market')).not.toBeInTheDocument();
        expect(screen.queryByText('Metadata')).not.toBeInTheDocument();
    });
});
