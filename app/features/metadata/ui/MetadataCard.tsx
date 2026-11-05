import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import type { Account } from '@/app/providers/accounts';

import { extractMetaplexMetadata } from '../lib/metaplexMetadata';
import { extractTokenMetadata } from '../lib/tokenMetadata';
import { metadataLayoutAtom, toMetadataLayout } from '../model/layout-variant';
import { mockMetaplexAtom, mockMetaplexMetadata } from '../model/mock-metaplex';
import { useOffChainMetadata } from '../model/useOffChainMetadata';
import { BaseMetadataCard, type MetadataSection } from './BaseMetadataCard';

export function MetadataCard({ account }: { account: Account }) {
    const couldHaveOnChainData = Boolean(account.data.parsed);

    if (couldHaveOnChainData) {
        return <OnChainMetadataCard account={account} />;
    }
    return <OffChainMetadataCard account={account} />;
}

function OnChainMetadataCard({ account }: { account: Account }) {
    // REVIEW(HOO-928): layout picked in the design menu.
    const layout = toMetadataLayout(useAtomValue(metadataLayoutAtom));
    // REVIEW(HOO-928): the design menu's made-up Metaplex source, for the two-tab case on a preview.
    const mockMetaplex = useAtomValue(mockMetaplexAtom);
    const sections = useMemo<MetadataSection[]>(() => {
        const parsedData = account.data.parsed;

        const availableSections: MetadataSection[] = [];

        if (!parsedData) return availableSections;

        const tokenMetadata = extractTokenMetadata(parsedData);
        const metaplexMetadata = extractMetaplexMetadata(parsedData);

        if (tokenMetadata) {
            availableSections.push({
                data: tokenMetadata,
                id: 'token-metadata',
                title: 'Token extension',
            });
        }

        if (metaplexMetadata) {
            availableSections.push({
                data: metaplexMetadata,
                id: 'metaplex-metadata',
                title: 'Metaplex',
            });
        } else if (mockMetaplex && tokenMetadata) {
            availableSections.push({
                data: mockMetaplexMetadata(tokenMetadata),
                id: 'metaplex-metadata',
                title: 'Metaplex (mock)',
            });
        }

        return availableSections;
    }, [account, mockMetaplex]);

    return <BaseMetadataCard sections={sections} layout={layout} />;
}

function OffChainMetadataCard({ account }: { account: Account }) {
    // REVIEW(HOO-928): layout picked in the design menu.
    const layout = toMetadataLayout(useAtomValue(metadataLayoutAtom));
    const { metadata } = useOffChainMetadata(account.pubkey);

    const sections = (() => {
        const availableSections: MetadataSection[] = [];

        if (!metadata) return availableSections;

        availableSections.push({
            data: metadata,
            id: 'compressed-nft-metadata',
            title: 'Compressed NFT Metadata',
        });

        return availableSections;
    })();

    return <BaseMetadataCard sections={sections} layout={layout} />;
}
