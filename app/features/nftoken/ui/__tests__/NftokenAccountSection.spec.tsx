import type { Account } from '@providers/accounts';
import type { PublicKey } from '@solana/web3.js';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    accountBytes,
    COLLECTION,
    COLLECTION_FIELD,
    collectionAccount,
    MAINNET_AUTHORITY,
    MAINNET_NFT_ACCOUNTS,
    MAINNET_NFTS,
    NFT_CAN_UPDATE_OFFSET,
    NFT_IS_FROZEN_OFFSET,
    nftokenAccount,
} from '../../__tests__/fixtures';
import type { CollectionNftsAnswer } from '../../api/fetch-collection-nfts';
import { parseNftokenAccount } from '../../lib/nftoken-accounts';
import { NftokenAccountHeader } from '../NftokenAccountHeader';
import { NftokenAccountSection } from '../NftokenAccountSection';

const mocks = vi.hoisted(() => ({
    fetchAccountInfo: vi.fn(),
    fetchCollectionNfts: vi.fn(),
    fetchNftokenMetadata: vi.fn(),
    refreshAccount: vi.fn(),
}));

vi.mock('@entities/cluster', () => ({
    useCluster: () => ({ connectableUrl: 'https://mock.rpc' }),
    useClusterPath: ({ pathname }: { pathname: string }) => pathname,
}));
vi.mock('@providers/accounts', () => ({
    useAccountInfo: () => undefined,
    useFetchAccountInfo: () => mocks.fetchAccountInfo,
}));
vi.mock('@entities/account', () => ({
    useAccountFetching: () => false,
    useRawAccountDataOnMount: () => ({ data: undefined, isLoading: false }),
    useRefreshAccount: () => mocks.refreshAccount,
}));
vi.mock('@features/account', () => ({
    AccountCard: ({ children, refresh }: { children: ReactNode; refresh: () => void }) => (
        <>
            <button onClick={refresh}>Refresh</button>
            <div>{children}</div>
        </>
    ),
}));
vi.mock('@components/account/UnknownAccountCard', () => ({ UnknownAccountCard: () => <p>UnknownAccountCard</p> }));
vi.mock('@components/common/Address', () => ({
    Address: ({ pubkey }: { pubkey: PublicKey }) => <span>{pubkey.toBase58()}</span>,
}));
vi.mock('../../api/fetch-collection-nfts', () => ({ fetchCollectionNfts: mocks.fetchCollectionNfts }));
vi.mock('../../api/fetch-nftoken-metadata', () => ({ fetchNftokenMetadata: mocks.fetchNftokenMetadata }));

const [NFT] = MAINNET_NFTS;

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('NftokenAccountSection', () => {
    it('should show each labelled field of an NFT', () => {
        renderSection(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        expectRow('Address', NFT.pubkey);
        expectRow('Authority', MAINNET_AUTHORITY);
        expectRow('Holder', NFT.holder);
        expectRow('Delegate', 'Not Delegated');
        expectRow('Collection', COLLECTION);
    });

    it('should show whether an NFT is frozen', () => {
        renderSection(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        expectRow('Frozen', 'No');
    });

    it('should show a frozen NFT as frozen', () => {
        const data = accountBytes(NFT.base64);
        data[NFT_IS_FROZEN_OFFSET] = 1;

        renderSection(nftokenAccount(data, NFT.pubkey));

        expectRow('Frozen', 'Yes');
    });

    it('should show No Collection for an NFT without a collection', () => {
        const data = accountBytes(NFT.base64);
        data.fill(0, COLLECTION_FIELD.start, COLLECTION_FIELD.end);

        renderSection(nftokenAccount(data, NFT.pubkey));

        expectRow('Collection', 'No Collection');
    });

    it('should show the authority of a collection', () => {
        mocks.fetchCollectionNfts.mockResolvedValue({
            kind: 'loaded',
            nfts: MAINNET_NFT_ACCOUNTS,
            undecodableCount: 0,
        });

        renderSection(collectionAccount());

        expectRow('Address', COLLECTION);
        expectRow('Authority', MAINNET_AUTHORITY);
    });

    it('should count every NFT account in a collection, including the ones that do not decode', async () => {
        mocks.fetchCollectionNfts.mockResolvedValue({
            kind: 'loaded',
            nfts: MAINNET_NFT_ACCOUNTS,
            undecodableCount: 2,
        });

        renderSectionWithHeader(collectionAccount());

        expect(await screen.findByText(String(MAINNET_NFT_ACCOUNTS.length + 2))).toBeInTheDocument();
        expect(screen.getByText('Number of NFTs')).toBeInTheDocument();
    });

    it('should count the NFTs again when the user refreshes the overview', async () => {
        mocks.fetchCollectionNfts
            .mockResolvedValueOnce({ kind: 'loaded', nfts: MAINNET_NFT_ACCOUNTS, undecodableCount: 0 })
            .mockResolvedValueOnce({ kind: 'loaded', nfts: MAINNET_NFT_ACCOUNTS.slice(1), undecodableCount: 0 });
        const account = collectionAccount();
        renderSectionWithHeader(account);
        await screen.findByText(String(MAINNET_NFT_ACCOUNTS.length));

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        expect(await screen.findByText(String(MAINNET_NFT_ACCOUNTS.length - 1))).toBeInTheDocument();
        expect(mocks.refreshAccount).toHaveBeenCalledWith(account.pubkey, 'parsed');
    });

    it('should show the count when the user clicks Refresh twice before the request resolves', async () => {
        let answer: (value: CollectionNftsAnswer) => void = () => {};
        mocks.fetchCollectionNfts
            .mockRejectedValueOnce(new Error('HTTP error (429)'))
            .mockReturnValueOnce(new Promise(resolve => (answer = resolve)))
            .mockRejectedValue(new Error('HTTP error (429)'));
        renderSectionWithHeader(collectionAccount());
        await screen.findByText('Fetch Failed');

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        await act(async () => answer({ kind: 'loaded', nfts: MAINNET_NFT_ACCOUNTS, undecodableCount: 0 }));

        expect(await screen.findByText(String(MAINNET_NFT_ACCOUNTS.length))).toBeInTheDocument();
    });

    it.each([
        ['an NFT', () => nftokenAccount(accountBytes(NFT.base64), NFT.pubkey)],
        ['a collection', collectionAccount],
    ])('should show the new name in the header when the user refreshes the overview of %s', async (_, account) => {
        mocks.fetchCollectionNfts.mockResolvedValue({
            kind: 'loaded',
            nfts: MAINNET_NFT_ACCOUNTS,
            undecodableCount: 0,
        });
        mocks.fetchNftokenMetadata
            .mockResolvedValueOnce({ kind: 'loaded', metadata: { image: undefined, name: 'Old name' } })
            .mockResolvedValue({ kind: 'loaded', metadata: { image: undefined, name: 'New name' } });
        renderSectionWithHeader(account());
        await screen.findByRole('heading', { name: 'Old name' });

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        expect(await screen.findByRole('heading', { name: 'New name' })).toBeInTheDocument();
    });

    it.each([
        ['unsupported', () => mocks.fetchCollectionNfts.mockResolvedValue({ kind: 'unsupported' })],
        ['refused', () => mocks.fetchCollectionNfts.mockResolvedValue({ kind: 'refused' })],
        ['failed', () => mocks.fetchCollectionNfts.mockRejectedValue(new Error('HTTP error (503)'))],
    ])('should show Fetch Failed as the count when the request is %s', async (_, arrange) => {
        arrange();

        renderSectionWithHeader(collectionAccount());

        expect(await screen.findByText('Fetch Failed')).toBeInTheDocument();
        expect(screen.getByText('Number of NFTs')).toBeInTheDocument();
    });

    it('should stop requesting the NFTs after two retries', async () => {
        vi.useFakeTimers();
        mocks.fetchCollectionNfts.mockRejectedValue(new Error('HTTP error (503)'));

        renderSectionWithHeader(collectionAccount());
        await act(() => vi.advanceTimersByTimeAsync(10 * 60_000));

        expect(mocks.fetchCollectionNfts).toHaveBeenCalledTimes(3);
        expectRow('Number of NFTs', 'Fetch Failed');
    });

    it('should show the metadata of an NFT its authority can update as Mutable', () => {
        renderSection(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        expectRow('Metadata', 'Mutable');
    });

    it('should show the metadata of an NFT its authority cannot update as Immutable', () => {
        const data = accountBytes(NFT.base64);
        data[NFT_CAN_UPDATE_OFFSET] = 0;

        renderSection(nftokenAccount(data, NFT.pubkey));

        expectRow('Metadata', 'Immutable');
    });

    it('should show the metadata mutability of a collection', () => {
        mocks.fetchCollectionNfts.mockReturnValue(new Promise(() => {}));

        renderSection(collectionAccount());

        expectRow('Metadata', 'Mutable');
    });

    it.each([
        ['an NFT', () => nftokenAccount(accountBytes(NFT.base64), NFT.pubkey)],
        ['a collection', collectionAccount],
    ])('should link the website from the metadata of %s', async (_, account) => {
        mocks.fetchCollectionNfts.mockReturnValue(new Promise(() => {}));
        mocks.fetchNftokenMetadata.mockResolvedValue({
            kind: 'loaded',
            metadata: { externalUrl: 'https://glow.app', image: undefined, name: 'A' },
        });

        renderSection(account());

        expect(await screen.findByRole('link', { name: 'https://glow.app' })).toHaveAttribute(
            'href',
            'https://glow.app',
        );
        expect(screen.getByText('Website')).toBeInTheDocument();
    });

    it('should show a dash for metadata without a website', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue({ kind: 'loaded', metadata: { image: undefined, name: 'A' } });

        renderSection(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        expect(await screen.findByText('—')).toBeInTheDocument();
    });

    it('should show a website that is not an http(s) address as text, not a link', async () => {
        mocks.fetchNftokenMetadata.mockResolvedValue({
            kind: 'loaded',
            metadata: { externalUrl: 'javascript:alert(1)', image: undefined, name: 'A' },
        });

        renderSection(nftokenAccount(accountBytes(NFT.base64), NFT.pubkey));

        expect(await screen.findByText('javascript:alert(1)')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).not.toBeInTheDocument();
    });

    it('should render the unknown account card for data that does not decode', () => {
        renderSection(nftokenAccount(new Uint8Array(188), NFT.pubkey));

        expect(screen.getByText('UnknownAccountCard')).toBeInTheDocument();
        expect(mocks.fetchCollectionNfts).not.toHaveBeenCalled();
    });
});

// Each KeyValue renders its label and value as their own text nodes, so an exact match on both
// confirms the labelled field is present.
function expectRow(label: string, value: string) {
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(value)).toBeInTheDocument();
}

function renderSection(account: Account) {
    return render(<NftokenAccountSection account={account} />, { wrapper: Providers });
}

function renderSectionWithHeader(account: Account) {
    const nftoken = parseNftokenAccount(account);
    if (!nftoken) throw new Error('the fixture does not decode');
    return render(
        <>
            <NftokenAccountHeader nftoken={nftoken} />
            <NftokenAccountSection account={account} />
        </>,
        { wrapper: Providers },
    );
}

function Providers({ children }: { children: ReactNode }) {
    return <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{children}</SWRConfig>;
}
