import type { Account } from '@providers/accounts';
import { act, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    accountBytes,
    COLLECTION,
    COLLECTION_FIELD,
    collectionAccount,
    MAINNET_COLLECTION,
    MAINNET_NFTS,
    nftokenAccount,
} from '../../__tests__/fixtures';
import { parseNftokenAccount } from '../../lib/nftoken-accounts';
import { NftokenAccountHeader } from '../NftokenAccountHeader';

const mocks = vi.hoisted(() => ({
    accountEntries: new Map<string, { data: Account }>(),
    fetchAccountInfo: vi.fn(),
    fetchCollectionNfts: vi.fn(),
    fetchNftokenMetadata: vi.fn(),
}));

vi.mock('@entities/cluster', () => ({
    useCluster: () => ({ connectableUrl: 'https://mock.rpc' }),
    useClusterPath: ({ pathname }: { pathname: string }) => pathname,
}));
vi.mock('@providers/accounts', () => ({
    useAccountInfo: (address: string | undefined) => (address ? mocks.accountEntries.get(address) : undefined),
    useFetchAccountInfo: () => mocks.fetchAccountInfo,
}));
vi.mock('../../api/fetch-collection-nfts', () => ({ fetchCollectionNfts: mocks.fetchCollectionNfts }));
vi.mock('../../api/fetch-nftoken-metadata', () => ({ fetchNftokenMetadata: mocks.fetchNftokenMetadata }));

const [NFT] = MAINNET_NFTS;
const NAMED = { kind: 'loaded', metadata: { image: undefined, name: 'Genesis: friends.glow' } } as const;

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mocks.accountEntries.clear();
});

describe('NftokenAccountHeader', () => {
    it('should show the NFT name from the metadata at its URL', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue(NAMED);

        renderHeader(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        expect(await screen.findByRole('heading', { name: 'Genesis: friends.glow' })).toBeInTheDocument();
        expect(screen.getByText('NFToken NFT')).toBeInTheDocument();
        expect(mocks.fetchNftokenMetadata).toHaveBeenCalledExactlyOnceWith(NFT.metadataUrl);
    });

    it('should show a collection under the collection label', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue(NAMED);
        mocks.fetchCollectionNfts.mockReturnValue(new Promise(() => {}));

        renderHeader(collectionAccount());

        expect(await screen.findByRole('heading', { name: 'Genesis: friends.glow' })).toBeInTheDocument();
        expect(screen.getByText('NFToken Collection')).toBeInTheDocument();
        expect(mocks.fetchNftokenMetadata).toHaveBeenCalledExactlyOnceWith(MAINNET_COLLECTION.metadataUrl);
    });

    it('should count the NFTs of a collection', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue(NAMED);
        mocks.fetchCollectionNfts.mockResolvedValue({ kind: 'loaded', nfts: [], undecodableCount: 4 });

        renderHeader(collectionAccount());

        expect(await screen.findByText('4')).toBeInTheDocument();
        expect(mocks.fetchCollectionNfts).toHaveBeenCalledExactlyOnceWith(
            'https://mock.rpc',
            MAINNET_COLLECTION.pubkey,
        );
    });

    it('should not ask for the NFTs of an NFT', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue(NAMED);

        renderHeader(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        await screen.findByRole('heading', { name: 'Genesis: friends.glow' });
        expect(mocks.fetchCollectionNfts).not.toHaveBeenCalled();
    });

    it('should link the collection of an NFT by its name once the collection loads', async () => {
        mocks.accountEntries.set(COLLECTION, { data: collectionAccount() });
        mocks.fetchNftokenMetadata.mockImplementation(async (uri: string) =>
            uri === MAINNET_COLLECTION.metadataUrl
                ? { kind: 'loaded', metadata: { image: undefined, name: 'Genesis collection' } }
                : NAMED,
        );

        renderHeader(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        expect(await screen.findByRole('link', { name: 'Genesis collection' })).toHaveAttribute(
            'href',
            `/address/${COLLECTION}`,
        );
        expect(mocks.fetchAccountInfo).not.toHaveBeenCalled();
    });

    it('should load the collection account of an NFT and link its short address meanwhile', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue(NAMED);

        renderHeader(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        expect(
            await screen.findByRole('link', { name: `${COLLECTION.slice(0, 4)}…${COLLECTION.slice(-4)}` }),
        ).toBeInTheDocument();
        expect(mocks.fetchAccountInfo).toHaveBeenCalledWith(expect.anything(), 'parsed');
        expect(mocks.fetchAccountInfo.mock.calls[0][0].toBase58()).toBe(COLLECTION);
    });

    it('should show a dash for an NFT outside any collection', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue(NAMED);
        const data = accountBytes(NFT.base64);
        data.fill(0, COLLECTION_FIELD.start, COLLECTION_FIELD.end);

        renderHeader(nftokenAccount(data, NFT.pubkey));

        expect(await screen.findByText('Collection')).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(mocks.fetchAccountInfo).not.toHaveBeenCalled();
    });

    it('should stop requesting the metadata after two retries', async () => {
        vi.useFakeTimers();
        mocks.fetchNftokenMetadata.mockRejectedValue(new Error('NFToken metadata fetch failed: 503'));

        renderHeader(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));
        await act(() => vi.advanceTimersByTimeAsync(10 * 60_000));

        expect(mocks.fetchNftokenMetadata).toHaveBeenCalledTimes(3);
        expect(screen.getByRole('heading', { name: 'Failed to load metadata' })).toBeInTheDocument();
    });
});

function renderHeader(account: Account) {
    const nftoken = parseNftokenAccount(account);
    if (!nftoken) throw new Error('the fixture does not decode');
    return render(<NftokenAccountHeader nftoken={nftoken} />, { wrapper: Providers });
}

function Providers({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{children}</SWRConfig>;
}
