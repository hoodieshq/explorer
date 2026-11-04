'use client';

import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { useMediaQuery } from '@mantine/hooks';
import dynamic from 'next/dynamic';

// Lazy + ssr:false mirrors the navbar's SearchBarLoader: cmdk/Popover are client-only, and keeping
// the hero copy out of SSR avoids a second hydration pass for the same widget.
const SearchBar = dynamic(() => import('@features/search').then(mod => ({ default: mod.SearchBar })), {
    loading: () => <Skeleton className="h-14 w-full rounded-xl bg-heavy-metal-800 sm:h-16" />,
    ssr: false,
});

// Scale the shared SearchBar up to a hero size via descendant overrides — the same technique the
// navbar uses to restyle the frame without forking the component.
const HERO_SIZING = cn(
    '[&_[data-search-frame]]:!h-14 sm:[&_[data-search-frame]]:!h-16',
    '[&_[data-search-frame]]:!rounded-xl [&_[data-search-frame]]:!pl-4 [&_[data-search-frame]]:!pr-3',
    '[&_[data-search-frame]>svg]:!size-5',
    '[&_input]:!text-base sm:[&_input]:!text-lg',
    '[&_kbd]:!h-7 [&_kbd]:!w-7',
);

export function HomeSearch() {
    // Initial value false → SSR/first render use the long placeholder; it swaps to the short one in an
    // effect on small screens, where the long string would otherwise overflow and clip the input.
    const isSmall = useMediaQuery('(max-width: 640px)', false);
    const placeholder = isSmall ? 'Search an address or signature' : 'Search an address, signature, block or token';

    return (
        <div className={cn('w-full', HERO_SIZING)}>
            {/* autoFocus=false so the hero field does not fight the navbar search for focus on load. */}
            <SearchBar autoFocus={false} placeholder={placeholder} />
        </div>
    );
}
