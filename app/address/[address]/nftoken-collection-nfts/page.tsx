import { NFTokenCollectionNFTGrid } from '@components/account/nftoken/NFTokenCollectionNFTGrid';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: Promise<{
        address: string;
    }>;
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `NFToken NFTs belonging to the collection ${(await props.params).address} on Solana`,
        title: `NFToken Collection NFTs | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default async function NFTokenCollectionPage(props: Props) {
    const params = await props.params;

    const { address } = params;

    return <NFTokenCollectionNFTGrid collection={address} />;
}
