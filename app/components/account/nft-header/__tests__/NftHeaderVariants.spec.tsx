import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    useNftCreatorsPlacement,
    useNftCreatorsShare,
    useNftCreatorsUnverified,
} from '@/app/components/account/nft-creators-variant';
import { useNftCardSpacing, useNftOriginalLinkPlacement } from '@/app/components/account/nft-header-options';

import type { NftHeaderModel } from '../model';
import { NftHeaderLayout } from '../NftHeaderVariants';

// The creators' addresses read the cluster; their links are not what these tests look at.
vi.mock('@components/common/Address', () => ({ Address: () => null }));
vi.mock('@/app/components/account/nft-creators-variant', () => ({
    useNftCreatorsPlacement: vi.fn(() => 'header'),
    useNftCreatorsShare: vi.fn(() => 'column'),
    useNftCreatorsUnverified: vi.fn(() => 'icon'),
}));
vi.mock('@/app/components/account/nft-header-options', () => ({
    useNftCardSpacing: vi.fn(() => 'stretch'),
    useNftOriginalLinkPlacement: vi.fn(() => 'current'),
}));
vi.mock('@utils/url', () => ({
    useClusterPath: vi.fn(({ pathname }: { pathname: string }) => pathname),
}));

const MODEL: NftHeaderModel = {
    compressed: false,
    creators: null,
    edition: '1/1',
    mutable: true,
    name: 'Cool NFT #42',
    primarySaleHappened: false,
    symbol: 'COOL',
    typeLabel: 'Metaplex NFT',
};

// REVIEW(HOO-921): HOO-929's card headers, which keep the RC header's rows and leave the Overview card as it is.
describe('NftHeaderLayout, card headers', () => {
    it.each(['card', 'split'] as const)('should title the card with the type and keep the RC rows (%s)', variant => {
        render(<NftHeaderLayout variant={variant} model={MODEL} />);

        expect(screen.getByText('Metaplex NFT')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cool NFT #42' })).toBeInTheDocument();
        const labels = screen.getAllByRole('term').map(term => term.textContent);
        expect(labels).toEqual(['Symbol', 'Edition', 'Collection', 'Creators']);
        expect(within(screen.getAllByRole('definition')[0]).getByText('COOL')).toBeInTheDocument();
    });

    it('should mark an unverified creator with text and, for phones, a question mark', () => {
        render(<NftHeaderLayout variant="card" model={{ ...MODEL, creators: CREATORS }} />);

        expect(screen.getByText('· unverified', { exact: false })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Unverified' })).toHaveLength(1);
    });

    it('should mark an unverified creator with text alone when the menu says so', () => {
        vi.mocked(useNftCreatorsUnverified).mockReturnValueOnce('text');
        render(<NftHeaderLayout variant="card" model={{ ...MODEL, creators: CREATORS }} />);

        expect(screen.getByText('· unverified', { exact: false })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Unverified' })).not.toBeInTheDocument();
    });

    it.each([
        ['column', 'grid'],
        ['inline', 'flex-col'],
    ] as const)('should lay the shares out as a %s', (share, listClass) => {
        vi.mocked(useNftCreatorsShare).mockReturnValueOnce(share);
        render(<NftHeaderLayout variant="card" model={{ ...MODEL, creators: CREATORS }} />);

        // eslint-disable-next-line testing-library/no-node-access -- the list's own box is what the variant changes
        expect(screen.getByText('100%').closest('dd')?.firstElementChild).toHaveClass(listClass);
    });

    it.each(['card', 'split', 'wideArt'] as const)(
        'should leave the creators to the Overview card when moved (%s)',
        variant => {
            vi.mocked(useNftCreatorsPlacement).mockReturnValueOnce('overview');
            render(<NftHeaderLayout variant={variant} model={{ ...MODEL, creators: CREATORS }} />);

            expect(screen.queryByText('Creators')).not.toBeInTheDocument();
            expect(screen.queryByText('100%')).not.toBeInTheDocument();
        },
    );

    it.each(['card', 'split', 'wideArt'] as const)(
        "should put the image's site in an Original row when moved (%s)",
        variant => {
            vi.mocked(useNftOriginalLinkPlacement).mockReturnValue('row');
            render(<NftHeaderLayout variant={variant} model={{ ...MODEL, image: 'https://example.com/art.png' }} />);

            expect(screen.getAllByRole('term').map(term => term.textContent)).toContain('Original');
            // The text, not the accessible name, which the `<wbr>` after the dot gets in the way of.
            expect(screen.getAllByRole('button').map(button => button.textContent)).toContain('example.com');
            expect(screen.queryByRole('button', { name: 'View original' })).not.toBeInTheDocument();
            vi.mocked(useNftOriginalLinkPlacement).mockReturnValue('current');
        },
    );

    it('should keep the name and the facts when the card centres them', () => {
        vi.mocked(useNftCardSpacing).mockReturnValueOnce('centred');
        render(<NftHeaderLayout variant="card" model={MODEL} />);

        // eslint-disable-next-line testing-library/no-node-access -- the shared box is what the variant adds
        const box = screen.getByRole('heading', { name: 'Cool NFT #42' }).closest('.sm\\:justify-center');
        expect(box).not.toBeNull();
        expect(
            within(box as HTMLElement)
                .getAllByRole('term')
                .map(term => term.textContent),
        ).toEqual(['Symbol', 'Edition', 'Collection', 'Creators']);
    });

    it.each(['card', 'split', 'wideArt'] as const)(
        'should hold the art box with the logo when there is no art (%s)',
        variant => {
            render(<NftHeaderLayout variant={variant} model={MODEL} />);

            expect(screen.getByTestId('nft-art-fallback')).toHaveClass('aspect-square');
        },
    );
});

const CREATORS = [
    { address: 'So11111111111111111111111111111111111111112', share: 0, verified: true },
    { address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', share: 100, verified: false },
];
