import { getEditionSummary, type NftCollection, type NftHeaderModel } from '@components/account/nft-header/model';
import { NftHeaderLayout } from '@components/account/nft-header/NftHeaderVariants';
import { useNftCollection } from '@components/account/nft-header/use-nft-collection';
import { useNftHeaderVariant } from '@components/account/nft-header-variant';
import { trimNullPadding } from '@entities/nft';
import { isSome } from '@metaplex-foundation/umi';
import { NFTData } from '@providers/accounts';

export function MetaplexNFTHeader({ nftData }: { nftData: NFTData }) {
    // REVIEW(HOO-921): picks the header variant under review; collapses to the chosen one before the external PR.
    const variant = useNftHeaderVariant();
    const collection = useVerifiedCollection(nftData);
    return <NftHeaderLayout variant={variant} model={metaplexNftHeaderModel(nftData, collection)} />;
}

/** REVIEW(HOO-921): the header variants' data for a regular NFT; the Overview card builds it too. */
export function metaplexNftHeaderModel(nftData: NFTData, collection?: NftCollection): NftHeaderModel {
    const { metadata } = nftData;
    const name = trimNullPadding(metadata.name);
    const symbol = trimNullPadding(metadata.symbol);
    const creators = isSome(metadata.creators) ? metadata.creators.value : null;
    return {
        collection,
        compressed: false,
        creators,
        edition: getEditionSummary(nftData.editionInfo),
        image: nftData.json?.image,
        mutable: metadata.isMutable,
        name: name !== '' ? name : 'Unnamed NFT',
        primarySaleHappened: metadata.primarySaleHappened,
        symbol: symbol !== '' ? symbol : undefined,
        typeLabel: 'Metaplex NFT',
    };
}

// The collection counts as verified once its mint account loads, as in the header this one replaces.
function useVerifiedCollection(nftData: NFTData): NftCollection | undefined {
    const collectionOpt = nftData.metadata.collection;
    const collection = collectionOpt && isSome(collectionOpt) ? collectionOpt.value : null;
    const address = collection?.key.toString();
    const { loaded, name } = useNftCollection(address);
    return address && collection?.verified && loaded ? { address, name } : undefined;
}
