import { act, render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAINNET_NFT_ACCOUNTS } from '../../__tests__/fixtures';
import { NftokenAttributesCard } from '../NftokenAttributesCard';

const mocks = vi.hoisted(() => ({ fetchNftokenMetadata: vi.fn() }));

vi.mock('../../api/fetch-nftoken-metadata', () => ({ fetchNftokenMetadata: mocks.fetchNftokenMetadata }));

const [NFT] = MAINNET_NFT_ACCOUNTS;

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('NftokenAttributesCard', () => {
    it('should list the traits from the metadata of the NFT', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue({
            kind: 'loaded',
            metadata: {
                image: undefined,
                name: 'A',
                traits: [
                    { type: 'Glow ID', value: 'friends' },
                    { type: 'Minted At', value: '2022-07-09T21:48:18.722Z' },
                ],
            },
        });

        renderCard();

        const table = await screen.findByRole('table', { name: 'Attributes' });
        expect(within(table).getAllByRole('row')).toHaveLength(3);
        expect(within(table).getByText('Glow ID')).toBeInTheDocument();
        expect(within(table).getByText('friends')).toBeInTheDocument();
        expect(mocks.fetchNftokenMetadata).toHaveBeenCalledExactlyOnceWith(NFT.metadata_url);
    });

    it.each([
        ['metadata without traits', { kind: 'loaded', metadata: { image: undefined, name: 'A' } }],
        ['unavailable metadata', { kind: 'unavailable' }],
    ])('should say there are no attributes for %s', async (_, answer) => {
        mocks.fetchNftokenMetadata.mockResolvedValue(answer);

        renderCard();

        expect(await screen.findByText('No attributes')).toBeInTheDocument();
    });

    it('should offer a retry when the metadata fails to load', async () => {
        vi.useFakeTimers();
        mocks.fetchNftokenMetadata.mockRejectedValue(new Error('NFToken metadata fetch failed: 503'));

        renderCard();
        await act(() => vi.advanceTimersByTimeAsync(10 * 60_000));

        expect(screen.getByText('Failed to fetch attributes')).toBeInTheDocument();
    });
});

function renderCard() {
    return render(<NftokenAttributesCard nft={NFT} />, { wrapper: Providers });
}

function Providers({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{children}</SWRConfig>;
}
