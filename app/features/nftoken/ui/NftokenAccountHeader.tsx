'use client';

import { KitAddress } from '@components/common/KitAddress';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { useAccountFetching, useRawAccountDataOnMount, useRefreshAccount } from '@entities/account';
import { useClusterPath } from '@entities/cluster';
import type { Account } from '@providers/accounts';
import { type ReactNode, useState } from 'react';
import { Code } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { useNftokenHeaderVariant } from '@/app/shared/lib/nftoken-header-variant';
import { BaseRawAccountRows } from '@/app/shared/ui/BaseRawAccountRows';

import type { NftokenAccount, NftokenCollectionAccount, NftokenNftAccount } from '../lib/nftoken-accounts';
import { useCollectionNfts } from '../model/use-collection-nfts';
import { useNftokenCollectionName } from '../model/use-nftoken-collection-name';
import {
    type NftokenMetadataState,
    useNftokenMetadata,
    useRefreshNftokenMetadata,
} from '../model/use-nftoken-metadata';
import { BaseNftokenHeader, type NftokenFact } from './BaseNftokenHeader';
import { MutabilityHint, NftokenWebsite } from './NftokenFieldValues';

/**
 * `download`: REVIEW(HOO-929) the Overview card's Download menu for the split header. The caller passes it in, because
 * it belongs to the `account` feature, which this one may not import.
 */
export function NftokenAccountHeader({
    nftoken,
    account,
    download,
}: {
    nftoken: NftokenAccount;
    account?: Account;
    download?: ReactNode;
}) {
    const metadata = useNftokenMetadata(nftoken.metadata_url);

    if (nftoken.kind === 'collection') {
        return <CollectionHeader collection={nftoken} metadata={metadata} account={account} download={download} />;
    }
    return <NftHeader nft={nftoken} metadata={metadata} account={account} download={download} />;
}

function NftHeader({
    nft,
    metadata,
    account,
    download,
}: {
    nft: NftokenNftAccount;
    metadata: NftokenMetadataState;
    account?: Account;
    download?: ReactNode;
}) {
    const name = useNftokenCollectionName(nft.collection);
    const href = useClusterPath({ pathname: `/address/${nft.collection}` });
    const collection = nft.collection ? { address: nft.collection, href, name } : undefined;
    const variant = useNftokenHeaderVariant();
    const overview = useOverviewActions({ account, analyticsSection: 'nft_token_card', download });

    // REVIEW(HOO-929): the Overview card's rows, which the split header shows in its place; the card header keeps to
    // its own Collection row and leaves the rest, and the buttons, to the Overview card.
    const facts: NftokenFact[] = [
        { label: 'Authority', value: <KitAddress address={nft.authority} link /> },
        { label: 'Holder', value: <KitAddress address={nft.holder} link /> },
        { label: 'Delegate', value: nft.delegate ? <KitAddress address={nft.delegate} link /> : 'Not Delegated' },
        { label: 'Frozen', value: nft.is_frozen ? 'Yes' : 'No' },
        { label: 'Metadata', value: <MutabilityHint kind="nft" mutable={nft.authority_can_update} /> },
        { label: 'Website', value: <NftokenWebsite metadata={metadata} /> },
        { label: 'Address', value: <KitAddress address={nft.address} /> },
    ];

    return (
        <BaseNftokenHeader
            kind="nft"
            metadata={metadata}
            collection={collection}
            {...(variant === 'split' && { facts, ...overview })}
            variant={variant}
        />
    );
}

// The Overview card and the NFTs tab ask for the same NFTs; SWR sends one request for all of them.
function CollectionHeader({
    collection,
    metadata,
    account,
    download,
}: {
    collection: NftokenCollectionAccount;
    metadata: NftokenMetadataState;
    account?: Account;
    download?: ReactNode;
}) {
    const nfts = useCollectionNfts(collection.address);
    const variant = useNftokenHeaderVariant();
    // Refresh counts the NFTs again too, as the Overview card's did.
    const overview = useOverviewActions({
        account,
        analyticsSection: 'nft_token_collection_card',
        download,
        refreshMore: nfts.refresh,
    });

    // REVIEW(HOO-929): as for an NFT; the Number of NFTs row is the header's own.
    const facts: NftokenFact[] = [
        { label: 'Authority', value: <KitAddress address={collection.authority} link /> },
        { label: 'Metadata', value: <MutabilityHint kind="collection" mutable={collection.authority_can_update} /> },
        { label: 'Website', value: <NftokenWebsite metadata={metadata} /> },
        { label: 'Address', value: <KitAddress address={collection.address} /> },
    ];

    return (
        <BaseNftokenHeader
            kind="collection"
            metadata={metadata}
            nfts={nfts}
            {...(variant === 'split' && { facts, ...overview })}
            variant={variant}
        />
    );
}

/**
 * REVIEW(HOO-929): the Overview card's Refresh, Raw and Download, for the split header, which hides that card. Raw
 * swaps the facts for the raw account rows, as it swapped the Overview's rows.
 */
function useOverviewActions({
    account,
    analyticsSection,
    download,
    refreshMore,
}: {
    account?: Account;
    analyticsSection: string;
    download?: ReactNode;
    refreshMore?: () => void;
}) {
    const [showRaw, setShowRaw] = useState(false);
    const fetching = useAccountFetching(account?.pubkey.toBase58());
    const refreshAccount = useRefreshAccount();
    const refreshMetadata = useRefreshNftokenMetadata();

    if (!account) return {};

    const refresh = () => {
        refreshAccount(account.pubkey, 'parsed');
        refreshMore?.();
        refreshMetadata();
    };

    return {
        actions: (
            <>
                <RefreshButton analyticsSection={analyticsSection} onClick={refresh} fetching={fetching} />
                <Button
                    variant={showRaw ? 'default' : 'outline'}
                    size="sm"
                    aria-label="Raw"
                    className={showRaw ? 'shadow-active-sm' : undefined}
                    onClick={() => setShowRaw(on => !on)}
                >
                    <Code size={12} />
                    <span className="hidden md:inline">Raw</span>
                </Button>
                {download}
            </>
        ),
        raw: showRaw ? <RawAccountRows account={account} /> : undefined,
    };
}

function RawAccountRows({ account }: { account: Account }) {
    const { data, isLoading } = useRawAccountDataOnMount(account.pubkey);

    return <BaseRawAccountRows account={account} rawData={data} isLoading={isLoading} />;
}
