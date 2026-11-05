'use client';

import { useClusterPath } from '@entities/cluster';
import type { ComponentProps } from 'react';

import { useNftokenCardSpacing, useNftokenOriginalLinkPlacement } from '@/app/shared/lib/nftoken-header-options';
import { useNftokenHeaderVariant } from '@/app/shared/lib/nftoken-header-variant';

import type { NftokenAccount, NftokenCollectionAccount, NftokenNftAccount } from '../lib/nftoken-accounts';
import { useCollectionNfts } from '../model/use-collection-nfts';
import { useNftokenCollectionName } from '../model/use-nftoken-collection-name';
import { type NftokenMetadataState, useNftokenMetadata } from '../model/use-nftoken-metadata';
import { BaseNftokenHeader } from './BaseNftokenHeader';

export function NftokenAccountHeader({ nftoken }: { nftoken: NftokenAccount }) {
    const metadata = useNftokenMetadata(nftoken.metadata_url);
    // REVIEW(HOO-929): the design menu's layout and its finer choices.
    const design = {
        cardSpacing: useNftokenCardSpacing(),
        originalLink: useNftokenOriginalLinkPlacement(),
        variant: useNftokenHeaderVariant(),
    };

    if (nftoken.kind === 'collection') {
        return <CollectionHeader collection={nftoken} metadata={metadata} design={design} />;
    }
    return <NftHeader nft={nftoken} metadata={metadata} design={design} />;
}

type HeaderDesign = Pick<ComponentProps<typeof BaseNftokenHeader>, 'cardSpacing' | 'originalLink' | 'variant'>;

function NftHeader({
    nft,
    metadata,
    design,
}: {
    nft: NftokenNftAccount;
    metadata: NftokenMetadataState;
    design: HeaderDesign;
}) {
    const name = useNftokenCollectionName(nft.collection);
    const href = useClusterPath({ pathname: `/address/${nft.collection}` });
    const collection = nft.collection ? { address: nft.collection, href, name } : undefined;

    return <BaseNftokenHeader kind="nft" metadata={metadata} collection={collection} {...design} />;
}

// The Overview card and the NFTs tab ask for the same NFTs; SWR sends one request for all of them.
function CollectionHeader({
    collection,
    metadata,
    design,
}: {
    collection: NftokenCollectionAccount;
    metadata: NftokenMetadataState;
    design: HeaderDesign;
}) {
    const nfts = useCollectionNfts(collection.address);

    return <BaseNftokenHeader kind="collection" metadata={metadata} nfts={nfts} {...design} />;
}
