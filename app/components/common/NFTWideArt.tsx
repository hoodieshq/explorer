'use client';

import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import solanaLogo from '@img/logos-solana/low-contrast-solana-logo.svg';
import { cva } from 'class-variance-authority';
import { type ReactNode, useState } from 'react';

import { type ImageFailure, ProxiedImage } from '@/app/features/metadata';

// The NFToken header's art: the "wide" art of the Metaplex NFT header from HOO-921, which isn't merged yet; fold the
// two into one once it is. It lives here, not in the NFToken feature, because a feature can't import the metadata
// feature's `ProxiedImage`.

/** The art at its own proportions, up to 480px tall and the slot's width. */
export function NFTWideArt({
    uri,
    under,
    onCard = false,
}: {
    uri?: string;
    /** Hung under the art's right edge, out of the layout, so the rows below keep their spacing. */
    under?: ReactNode;
    /** REVIEW(HOO-929): art set on a card gets smaller corners than the card's own. */
    onCard?: boolean;
}) {
    // The art's own size, known once it loads; tied to its uri so a new image starts from scratch.
    const [natural, setNatural] = useState<{ uri?: string; width: number; height: number }>();
    const loaded = natural?.uri === uri ? natural : undefined;

    return (
        <div className={ART_FRAME_CLASSES}>
            <ProxiedImage
                alt="nft"
                className={artVariants({ onCard })}
                height={ART_PIXELS}
                onLoad={event =>
                    setNatural({
                        height: event.currentTarget.naturalHeight,
                        uri,
                        width: event.currentTarget.naturalWidth,
                    })
                }
                fallback={failure => <NFTArtFallback className={skeletonVariants({ onCard })} failure={failure} />}
                placeholder={<ArtSkeleton onCard={onCard} />}
                style={loaded ? artStyle(loaded) : undefined}
                uri={uri}
                width={ART_PIXELS}
            />
            {under && <div className="absolute right-0 top-full">{under}</div>}
        </div>
    );
}

/** Holds the art's slot while the metadata naming the art loads. */
export function NFTWideArtPlaceholder({ onCard = false }: { onCard?: boolean }) {
    return (
        <div className={ART_FRAME_CLASSES}>
            <ArtSkeleton onCard={onCard} />
        </div>
    );
}

/**
 * Stands in for art that is missing or failed: the Solana logo in the loading square's box and corners, so the slot
 * keeps the size and shape it had while loading.
 */
export function NFTArtFallback({ className, failure }: { className: string; failure?: ImageFailure }) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            alt={failure?.reason ?? ''}
            // The logo's own tile has wider corners than the box; filled with the tile's colour, its transparent
            // corners vanish and the box's radius is the one that shows.
            className={cn(className, 'bg-[#212b2a]')}
            src={solanaLogo.src}
            title={failure?.reason}
        />
    );
}

// While the art loads, a square holds the space the art will most likely take. It has a width of its own, because
// the art's slot takes its width from what it holds.
function ArtSkeleton({ onCard }: { onCard: boolean }) {
    return <Skeleton className={skeletonVariants({ onCard })} />;
}

// On a card: the NFT cards' pair, 4px art in an 8px card.
const RADIUS = { false: 'rounded-lg', true: 'rounded' } as const;

// `w-fit`: the art sets the slot's width (so "View original" can hang under its right edge) and stays at the left;
// from `sm` the header's grid track caps it at 320px or half the row. `min-w-0` lets the track hold that cap while
// the loading square, which unlike the image can't shrink, asks for its full width: without it the square grows
// the track to 480px, taller than the art that replaces it.
const ART_FRAME_CLASSES = 'relative flex w-fit min-w-0 max-w-full flex-col items-start self-start';
const artVariants = cva('block h-auto max-h-[480px] w-auto max-w-full', { variants: { onCard: RADIUS } });
const skeletonVariants = cva('aspect-square w-[min(480px,calc(100vw-2rem))] max-w-full', {
    variants: { onCard: RADIUS },
});
const ART_PIXELS = 320;
// The height cap: the art is shown whole but can't stretch the page, however odd its proportions. The width cap is
// the slot's.
const MAX_HEIGHT = 480;
// Art this small is almost always pixel art, drawn to be enlarged with hard edges.
const PIXEL_ART_MAX_SIDE = 256;

// The width that makes the art exactly as tall as the cap, so small art scales up as well as large art scales down;
// `max-w-full` then narrows it to the slot, keeping its proportions. Small art also keeps hard pixel edges instead of
// the browser's blur.
function artStyle({ width, height }: { width: number; height: number }) {
    if (width === 0 || height === 0) return undefined;
    return {
        imageRendering: Math.max(width, height) <= PIXEL_ART_MAX_SIDE ? ('pixelated' as const) : undefined,
        width: Math.round((MAX_HEIGHT * width) / height),
    };
}
