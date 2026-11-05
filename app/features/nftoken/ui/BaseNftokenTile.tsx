import { NFTArtFallback } from '@components/common/NFTWideArt';
import { Skeleton } from '@components/shared/ui/skeleton';
import Link from 'next/link';
import type { Ref } from 'react';

import { ProxiedImage } from '@/app/features/metadata';

import type { NftokenMetadataState } from '../model/use-nftoken-metadata';

// The `<img>`'s own size attributes; the card stretches the art to its column.
const IMAGE_PIXELS = 240;

/** One NFT of a collection as a card: its art and its name, a link to the NFT's page that covers the whole card. */
export function BaseNftokenTile({
    href,
    metadata,
    ref,
}: {
    href: string;
    metadata: NftokenMetadataState;
    ref?: Ref<HTMLDivElement>;
}) {
    return (
        // `pb-2`: under the name the card needs less room than around the art.
        <div
            ref={ref}
            className="relative flex h-full flex-col gap-2 rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 px-2.5 pb-2 pt-2.5 transition-colors hover:border-outer-space-600"
        >
            {metadata.kind === 'loading' ? (
                <Skeleton className={ART_CLASSES} />
            ) : (
                // An empty `alt`: the name under the art already names the card, so a screen reader reads it once.
                <ProxiedImage
                    alt=""
                    className={ART_CLASSES}
                    fallback={failure => <NFTArtFallback className={ART_CLASSES} failure={failure} />}
                    height={IMAGE_PIXELS}
                    // Its own skeleton: `ProxiedImage`'s default one takes the size attributes as an inline style,
                    // which beats `w-full` and spills a 240px square out of the card while the art loads.
                    placeholder={<Skeleton className={ART_CLASSES} />}
                    uri={metadata.kind === 'loaded' ? metadata.metadata.image : undefined}
                    width={IMAGE_PIXELS}
                />
            )}
            {/* The name is the link, coloured like every other link; its `after` box stretches over the card, so a
                click anywhere on the card opens the NFT. Two lines at most, so a long name can't stretch its row. */}
            <Link
                href={href}
                className="line-clamp-2 break-words text-sm after:absolute after:inset-0 after:rounded-lg after:content-['']"
            >
                {/* A status in place of a name reads in the muted gray of empty values, not in the link's colour. */}
                {metadata.kind === 'unavailable' || metadata.kind === 'failed' ? (
                    <span className="text-outer-space-300">{tileName(metadata)}</span>
                ) : (
                    tileName(metadata)
                )}
            </Link>
        </div>
    );
}

// A square that crops (`object-cover`), so cards of differently shaped art line up in the grid.
const ART_CLASSES = 'block aspect-square h-auto w-full rounded object-cover';

function tileName(metadata: NftokenMetadataState): string {
    switch (metadata.kind) {
        case 'loading':
            return 'Loading...';
        case 'loaded':
            return metadata.metadata.name ?? 'No Name';
        // No metadata to read a name from, unlike metadata that loaded without one.
        case 'unavailable':
            return 'Name not loaded';
        case 'failed':
            return 'Failed to load metadata';
    }
}
