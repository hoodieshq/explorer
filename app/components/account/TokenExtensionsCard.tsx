'use client';

import { RefreshButton } from '@components/shared/ui/refresh-button';
import { useAccountFetching, useRefreshAccount } from '@entities/account';
import { useCluster } from '@providers/cluster';
import { PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import { useMemo } from 'react';
import useSWR from 'swr';

import { CollapsibleSection } from '@/app/components/shared/ui/collapsible-section';
import { populatePartialParsedTokenExtension } from '@/app/utils/token-extension';
import { getTokenInfo, getTokenInfoSwrKey } from '@/app/utils/token-info';
import { TokenExtension } from '@/app/validators/accounts/token-extension';

import { LoadingCard } from '../common/LoadingCard';
import { TokenExtensionsSection } from './TokenExtensionsSection';
import { ParsedTokenExtension } from './types';

async function fetchTokenInfo([_, address, cluster, url]: ['get-token-info', string, Cluster, string]) {
    return await getTokenInfo(new PublicKey(address), cluster, url);
}

export function TokenExtensionsCard({
    decimals,
    address,
    extensions: mintExtensions,
}: {
    decimals: number;
    address: string;
    extensions: TokenExtension[];
}) {
    const { cluster, url } = useCluster();
    const refresh = useRefreshAccount();
    const fetching = useAccountFetching(address);
    const swrKey = useMemo(() => getTokenInfoSwrKey(address, cluster, url), [address, cluster, url]);
    const { data: tokenInfo, isLoading } = useSWR(swrKey, fetchTokenInfo);

    const extensions = populateTokenExtensions(mintExtensions);

    // check for nullish decimals to satisfy constraint for required decimals.
    if (isLoading) {
        return <LoadingCard />;
    } else if (tokenInfo && tokenInfo.decimals !== null && decimals !== tokenInfo.decimals) {
        throw new Error('Can not fetch token info.');
    }

    const symbol =
        mintExtensions.find(({ extension }) => extension === 'tokenMetadata')?.state.symbol || tokenInfo?.symbol;

    // The section only titles the block: the table inside draws its own frame, as on the feature-gates page
    // (Table design), so `className` drops the section's default card.
    //
    // The tab is the last block on the page and the page layout adds no bottom padding, so the gap down
    // to the footer is the between-blocks rhythm (`PAGE_SECTION_GAP`: 36px, 48px from `lg`).
    return (
        <CollapsibleSection
            title="Extensions"
            className=""
            sectionClassName="mb-9 lg:mb-12"
            actions={
                <RefreshButton
                    analyticsSection="extensions_section"
                    onClick={() => refresh(new PublicKey(address), 'parsed')}
                    fetching={fetching}
                />
            }
        >
            <TokenExtensionsSection
                address={address}
                decimals={decimals}
                extensions={mintExtensions}
                parsedExtensions={extensions}
                symbol={symbol}
            />
        </CollapsibleSection>
    );
}

function populateTokenExtensions(extensions: TokenExtension[]): ParsedTokenExtension[] {
    const result = extensions.reduce((acc, { extension, state }) => {
        const data = populatePartialParsedTokenExtension(extension);
        acc.set(extension, {
            ...data,
            extension: extension,
            parsed: state,
        });

        return acc;
    }, new Map<string, ParsedTokenExtension>());

    return Array.from(result.values());
}
