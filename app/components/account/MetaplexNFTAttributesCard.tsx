import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { Account, isTokenProgramData } from '@providers/accounts';
import { cva } from 'class-variance-authority';
import React from 'react';

import { useCluster } from '@/app/providers/cluster';
import { useCompressedNft } from '@/app/providers/compressed-nft';
import { getProxiedUri } from '@/app/shared/lib/metadata-proxy';
import { Card } from '@/app/shared/ui/Card';

interface Attribute {
    trait_type: string;
    value: string;
}

const GRID_COLUMNS = ['Trait type', 'Value'] as const;

export function MetaplexNFTAttributesCard({ account, onNotFound }: { account?: Account; onNotFound: () => never }) {
    const { url } = useCluster();
    const compressedNft = useCompressedNft({ address: account?.pubkey.toString() ?? '', url });

    const parsedData = account?.data?.parsed;
    if (!parsedData || !isTokenProgramData(parsedData) || parsedData.parsed.type !== 'mint' || !parsedData.nftData) {
        if (compressedNft && compressedNft.compression.compressed) {
            return <NormalMetaplexNFTAttributesCard metadataUri={compressedNft.content.json_uri} />;
        }
        return onNotFound();
    }
    return <NormalMetaplexNFTAttributesCard metadataUri={parsedData.nftData.metadata.uri} />;
}

export function NormalMetaplexNFTAttributesCard({ metadataUri }: { metadataUri: string }) {
    const [attributes, setAttributes] = React.useState<Attribute[]>([]);
    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
    const [attempt, setAttempt] = React.useState(0);

    async function fetchMetadataAttributes(isCancelled: () => boolean) {
        try {
            // The browser caches a proxy error response, so a retry must skip the cache.
            const response = await fetch(getProxiedUri(metadataUri), attempt > 0 ? { cache: 'no-cache' } : undefined);
            const metadata = await response.json();
            if (isCancelled()) return;

            // Verify if the attributes value is an array
            if (Array.isArray(metadata.attributes)) {
                // Filter attributes to keep objects matching schema
                const filteredAttributes = metadata.attributes.filter((attribute: any) => {
                    return (
                        typeof attribute === 'object' &&
                        typeof attribute.trait_type === 'string' &&
                        (typeof attribute.value === 'string' || typeof attribute.value === 'number')
                    );
                });

                setAttributes(filteredAttributes);
                setStatus('success');
            } else {
                throw new Error('Attributes is not an array');
            }
        } catch (_error) {
            if (!isCancelled()) setStatus('error');
        }
    }

    function retryAttributes() {
        setStatus('loading');
        setAttempt(count => count + 1);
    }

    React.useEffect(() => {
        let cancelled = false;
        setStatus('loading');
        fetchMetadataAttributes(() => cancelled);
        return () => {
            cancelled = true;
        };
    }, [metadataUri, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

    if (status === 'loading') {
        return <LoadingCard />;
    }

    if (status === 'error') {
        return <ErrorCard retry={retryAttributes} text="Failed to fetch attributes" />;
    }

    return (
        <CollapsibleSection title="Attributes" className="">
            {/* Same surface as the Slot Hashes and Vote History grid cards. `!` because `cn` has no
                tailwind-merge, and the tw card's own `rounded-xl` would otherwise win. */}
            <Card variant="tight" className="!rounded-lg border-outer-space-800 bg-outer-space-900">
                <AttributesGrid attributes={attributes} />
            </Card>
        </CollapsibleSection>
    );
}

// `gridCellVariants` owns all grid cell styling. `role` picks header vs body chrome; header cells leave
// `column` at its default.
const gridCellVariants = cva('flex px-3 py-2.5', {
    defaultVariants: { column: 'none', role: 'body' },
    variants: {
        column: {
            // Both columns hold free text from the metadata JSON, and either can be long. They wrap
            // instead of truncating, so the page never scrolls sideways on a phone; `min-w-0` lets the
            // `1fr` track shrink below an unbroken value's width.
            none: '',
            text: 'min-w-0 break-words',
        },
        // `body`: top-aligned so the trait type lines up with the first line of a wrapped value.
        role: {
            body: 'items-start border-t border-solid border-outer-space-800',
            header: 'items-center whitespace-nowrap text-xs uppercase text-outer-space-300',
        },
    },
});

// The Slot Hashes grid's tracks, so the two tables line up: Trait type takes the
// `clamp(132px,25%,200px)` band, Value the rest.
function AttributesGrid({ attributes }: { attributes: Attribute[] }) {
    return (
        <div className="w-full text-sm text-white">
            {/* `contents` row wrappers generate no box, so the cells stay direct grid items: ARIA rows for
                screen readers without breaking the column alignment. */}
            <div role="table" aria-label="Attributes" className="grid grid-cols-[clamp(132px,25%,200px)_1fr]">
                <div role="row" className="contents">
                    {GRID_COLUMNS.map(label => (
                        <div key={label} role="columnheader" className={gridCellVariants({ role: 'header' })}>
                            {label}
                        </div>
                    ))}
                </div>
                {attributes.length > 0 ? (
                    attributes.map(({ trait_type, value }) => (
                        <div key={`${trait_type}:${value}`} role="row" className="contents">
                            <div role="cell" className={gridCellVariants({ column: 'text' })}>
                                {trait_type}
                            </div>
                            <div role="cell" className={gridCellVariants({ column: 'text' })}>
                                {value}
                            </div>
                        </div>
                    ))
                ) : (
                    <div role="row" className="contents">
                        <div
                            role="cell"
                            className="col-span-2 border-t border-solid border-outer-space-800 px-3 py-2.5 text-center text-outer-space-300"
                        >
                            No attributes found
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
