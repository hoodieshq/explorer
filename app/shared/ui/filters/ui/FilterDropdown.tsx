'use client';

import React from 'react';
import { ChevronDown, Search } from 'react-feather';

import { Input } from '@/app/components/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';

import { type FilterListOption, filterOptions } from '../lib/filter-options';
import { type FilterSelection, selectionHandlers } from '../lib/selection';
import { FilterOptionRows } from './FilterOptionRows';
import { useEscapeClearsQuery } from './use-escape-clears-query';
import { useOptionNavigation } from './use-option-navigation';

type Props = FilterSelection & {
    'aria-label'?: string;
    options: FilterListOption[];
    placeholder?: string;
    // Adds a search on top of the list; worth it once the options run long.
    searchable?: boolean;
    searchPlaceholder?: string;
};

/**
 * A select-like filter: the button shows the pick, and the list opens under it. A single pick closes it; several
 * picks keep it open, toggling each row. From the keyboard the open list is one Tab stop (its search field, or the
 * list itself): arrows move, Enter picks, Escape clears the search, then closes and returns focus to the button.
 */
export function FilterDropdown({
    'aria-label': ariaLabel,
    options,
    placeholder = 'Any',
    searchable = false,
    searchPlaceholder = 'Search',
    ...selection
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);
    const visibleOptions = React.useMemo(() => filterOptions(options, query), [options, query]);
    const { isSelected, pick } = selectionHandlers(
        selection,
        options.map(({ value }) => value),
    );
    const close = () => {
        setOpen(false);
        setQuery('');
    };
    const pickAndMaybeClose = (value: string) => {
        pick(value);
        if (!selection.multiple) close();
    };
    const navigation = useOptionNavigation({ isSelected, onPick: pickAndMaybeClose, options: visibleOptions });
    useEscapeClearsQuery(inputRef, query, setQuery);
    const pickedLabels = options.filter(({ value }) => isSelected(value)).map(({ label }) => label);

    return (
        <Popover open={open} onOpenChange={next => (next ? setOpen(true) : close())}>
            <PopoverTrigger asChild>
                {/* Shaped like the app's inputs. No Preflight here, so the button's font family is set by hand. */}
                <button
                    type="button"
                    aria-label={ariaLabel}
                    className="flex h-9 w-full cursor-pointer items-center gap-2 rounded border border-solid border-outer-space-950 bg-heavy-metal-900 px-3 text-left text-sm text-neutral-200 [font-family:inherit] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:border-white/20"
                >
                    <span
                        className={
                            pickedLabels.length > 0
                                ? 'min-w-0 flex-1 truncate'
                                : 'min-w-0 flex-1 truncate text-neutral-400'
                        }
                    >
                        {pickedLabels.length > 0 ? pickedLabels.join(', ') : placeholder}
                    </span>
                    <ChevronDown size={14} className="shrink-0 text-outer-space-300" />
                </button>
            </PopoverTrigger>
            {/* As wide as its button and no taller than the room below it; the list is its only scroller. */}
            <PopoverContent
                align="start"
                className="flex max-h-[min(20rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden"
            >
                {searchable && (
                    <div className="relative shrink-0 border-0 border-b border-solid border-outer-space-800">
                        <Search
                            size={12}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outer-space-300"
                        />
                        <Input
                            ref={inputRef}
                            autoFocus
                            variant="dark"
                            role="combobox"
                            aria-expanded
                            aria-autocomplete="list"
                            aria-controls={navigation.listId}
                            aria-activedescendant={navigation.activeDescendant}
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            onKeyDown={navigation.onKeyDown}
                            placeholder={searchPlaceholder}
                            aria-label={searchPlaceholder}
                            // The 32px filter control, made part of the dropdown like the listbox's search. `!`
                            // because `cn` doesn't dedupe the Input's own border, fill, ring and font.
                            inputSize="sm"
                            className="!rounded-none !border-0 !bg-transparent pl-8 ![font-family:inherit] focus-visible:!ring-0 focus-visible:!ring-offset-0"
                        />
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto py-1 scrollbar-styled">
                    <FilterOptionRows
                        aria-label={ariaLabel}
                        options={visibleOptions}
                        multiple={Boolean(selection.multiple)}
                        isSelected={isSelected}
                        onPick={pickAndMaybeClose}
                        activeValue={navigation.activeValue}
                        listId={navigation.listId}
                        onHover={navigation.onHover}
                        optionId={navigation.optionId}
                        // Without a search the list itself takes focus when the dropdown opens.
                        listFocus={
                            searchable
                                ? undefined
                                : {
                                      'aria-activedescendant': navigation.activeDescendant,
                                      onKeyDown: navigation.onKeyDown,
                                      tabIndex: 0,
                                  }
                        }
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
