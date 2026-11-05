'use client';

import { UnknownAccountCard } from '@components/account/UnknownAccountCard';
import { AccountAddressRow } from '@components/common/Account';
import { KitAddress } from '@components/common/KitAddress';
import { useRefreshAccount } from '@entities/account';
import { AccountCard } from '@features/account';
import type { Account } from '@providers/accounts';

import { type KeyValueRow, KeyValueRows } from '@/app/shared/ui/key-value';

import { type NftokenCollectionAccount, type NftokenNftAccount, parseNftokenAccount } from '../lib/nftoken-accounts';
import { useCollectionNfts } from '../model/use-collection-nfts';
import { useNftokenMetadata, useRefreshNftokenMetadata } from '../model/use-nftoken-metadata';
import { MutabilityHint, NftokenWebsite as Website } from './NftokenFieldValues';

export function NftokenAccountSection({ account }: { account: Account }) {
    const nftoken = parseNftokenAccount(account);

    switch (nftoken?.kind) {
        case 'nft':
            return <NftCard account={account} nft={nftoken} />;
        case 'collection':
            return <CollectionCard account={account} collection={nftoken} />;
        default:
            return <UnknownAccountCard account={account} />;
    }
}

function NftCard({ account, nft }: { account: Account; nft: NftokenNftAccount }) {
    const metadata = useNftokenMetadata(nft.metadata_url);
    const refreshAccount = useRefreshAccount();
    const refreshMetadata = useRefreshNftokenMetadata();
    const refresh = () => {
        refreshAccount(account.pubkey, 'parsed');
        refreshMetadata();
    };

    const rows: KeyValueRow[] = [
        { label: 'Authority', value: <KitAddress address={nft.authority} link /> },
        { label: 'Holder', value: <KitAddress address={nft.holder} link /> },
        {
            label: 'Delegate',
            value: nft.delegate ? <KitAddress address={nft.delegate} link /> : 'Not Delegated',
        },
        // Like the other yes / no account rows ("Upgradeable: Yes", "Executable: No").
        { label: 'Frozen', value: nft.is_frozen ? 'Yes' : 'No' },
        {
            label: 'Collection',
            value: nft.collection ? <KitAddress address={nft.collection} link /> : 'No Collection',
        },
        { label: 'Metadata', value: <MutabilityHint kind="nft" mutable={nft.authority_can_update} /> },
        { label: 'Website', value: <Website metadata={metadata} /> },
    ];

    return (
        <AccountCard title="Overview" account={account} refresh={refresh} analyticsSection="nft_token_card">
            <AccountAddressRow account={account} />
            <KeyValueRows rows={rows} />
        </AccountCard>
    );
}

function CollectionCard({ account, collection }: { account: Account; collection: NftokenCollectionAccount }) {
    const metadata = useNftokenMetadata(collection.metadata_url);
    const refreshAccount = useRefreshAccount();
    const refreshMetadata = useRefreshNftokenMetadata();
    // The header shows the count; Refresh here counts the NFTs again too, so the whole page refreshes at once.
    const nfts = useCollectionNfts(collection.address);
    const refresh = () => {
        refreshAccount(account.pubkey, 'parsed');
        nfts.refresh();
        refreshMetadata();
    };

    const rows: KeyValueRow[] = [
        { label: 'Authority', value: <KitAddress address={collection.authority} link /> },
        { label: 'Metadata', value: <MutabilityHint kind="collection" mutable={collection.authority_can_update} /> },
        { label: 'Website', value: <Website metadata={metadata} /> },
    ];

    return (
        <AccountCard title="Overview" account={account} refresh={refresh} analyticsSection="nft_token_collection_card">
            <AccountAddressRow account={account} />
            <KeyValueRows rows={rows} />
        </AccountCard>
    );
}
