'use client';

import { MetaplexNFTAttributesCard } from '@components/account/MetaplexNFTAttributesCard';
import { ParsedAccountRenderer } from '@components/account/ParsedAccountRenderer';
import { NftokenAttributesCard, parseNftokenAccount } from '@features/nftoken';
import React, { Suspense } from 'react';

import { LoadingCard } from '@/app/components/common/LoadingCard';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

function MetaplexNFTAttributesCardRenderer({
    account,
    onNotFound,
}: React.ComponentProps<React.ComponentProps<typeof ParsedAccountRenderer>['renderComponent']>) {
    const nftoken = account && parseNftokenAccount(account);
    if (nftoken?.kind === 'nft') return <NftokenAttributesCard nft={nftoken} />;

    return (
        <Suspense fallback={<LoadingCard />}>
            {<MetaplexNFTAttributesCard account={account} onNotFound={onNotFound} />}
        </Suspense>
    );
}

export default function MetaplexNFTAttributesPageClient({ params: { address } }: Props) {
    return <ParsedAccountRenderer address={address} renderComponent={MetaplexNFTAttributesCardRenderer} />;
}
