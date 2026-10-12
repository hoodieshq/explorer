'use client';

import React from 'react';
import { Search } from 'react-feather';

import { Input } from '@/app/components/shared/ui/input';
import { cn } from '@/app/components/shared/utils';

import { type FilterListOption, filterOptions } from '../lib/filter-options';
import { type FilterSelection, selectionHandlers } from '../lib/selection';
import { FilterOptionRows } from './FilterOptionRows';

type Props = FilterSelection & {
    className?: string;
    // Stretch to the height the parent leaves instead of the default 18rem cap, for a parent that is a fixed-height
    // flex column (a side panel): the list then scrolls on its own and the parent never does.
    fill?: boolean;
    options: FilterListOption[];
    searchPlaceholder?: string;
};

/**
 * A bounded window with every option inside and a search on top. Long lists scroll within it, so they neither run
 * down the page nor push the filters below out of place.
 */
export function FilterListbox({ className, fill = false, options, searchPlaceholder = 'Search', ...selection }: Props) {
    const [query, setQuery] = React.useState('');
    const visibleOptions = React.useMemo(() => filterOptions(options, query), [options, query]);
    // The list's height with every option shown, held as its floor while a search narrows it, so the window keeps
    // its size (down to "No matches") and nothing below it jumps.
    const listRef = React.useRef<HTMLDivElement>(null);
    const [fullHeight, setFullHeight] = React.useState<number>();
    React.useEffect(() => {
        if (query === '' && listRef.current) setFullHeight(listRef.current.offsetHeight);
    }, [query, options]);
    const { isSelected, pick } = selectionHandlers(
        selection,
        options.map(({ value }) => value),
    );

    return (
        <div
            className={cn(
                'flex min-h-0 flex-col overflow-hidden rounded border border-solid border-outer-space-800 focus-within:border-white/20',
                fill ? 'flex-1' : 'max-h-72',
                className,
            )}
        >
            <div className="relative shrink-0 border-0 border-b border-solid border-outer-space-800">
                <Search
                    size={12}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outer-space-300"
                />
                <Input
                    variant="dark"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    // The 32px filter control, made part of the window rather than a field inside it: no border, ring
                    // or fill of its own (the window's border lights up instead). `!` because `cn` doesn't dedupe the
                    // Input's own border, fill, ring and mono utilities.
                    inputSize="sm"
                    className="!rounded-none !border-0 !bg-transparent pl-8 ![font-family:inherit] focus-visible:!ring-0 focus-visible:!ring-offset-0"
                />
            </div>
            {/* The only scroller: `min-h-0` lets it shrink inside the column instead of overflowing it. */}
            <div
                ref={listRef}
                style={query === '' ? undefined : { minHeight: fullHeight }}
                role={selection.multiple ? 'group' : 'radiogroup'}
                aria-label={searchPlaceholder}
                className="min-h-0 flex-1 overflow-y-auto py-1 scrollbar-styled"
            >
                <FilterOptionRows
                    options={visibleOptions}
                    multiple={Boolean(selection.multiple)}
                    isSelected={isSelected}
                    onPick={pick}
                />
            </div>
        </div>
    );
}
