import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NftHeaderModel } from '../model';
import { NftHeaderLayout } from '../NftHeaderVariants';

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
});
