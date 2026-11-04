'use client';

import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';

import type { NftokenNftAccount } from '../lib/nftoken-accounts';
import { useNftokenMetadata, useRefreshNftokenMetadata } from '../model/use-nftoken-metadata';
import { BaseNftokenAttributes } from './BaseNftokenAttributes';

/** The Attributes tab of an NFToken NFT: the traits from its metadata, which the header has already asked for. */
export function NftokenAttributesCard({ nft }: { nft: NftokenNftAccount }) {
    const metadata = useNftokenMetadata(nft.metadata_url);
    const refreshMetadata = useRefreshNftokenMetadata();

    switch (metadata.kind) {
        case 'loading':
            return <LoadingCard />;
        case 'failed':
            return <ErrorCard retry={refreshMetadata} text="Failed to fetch attributes" />;
        case 'unavailable':
            return <BaseNftokenAttributes traits={[]} />;
        case 'loaded':
            return <BaseNftokenAttributes traits={metadata.metadata.traits ?? []} />;
    }
}
