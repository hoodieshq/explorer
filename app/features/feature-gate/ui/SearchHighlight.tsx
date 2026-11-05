'use client';

import React, { createContext, type ReactNode, useContext } from 'react';

import { SEARCH_HIGHLIGHT_CLASS_NAME } from '@/app/shared/ui/search-highlight';

import { findMatches } from '../lib/find-matches';

const SearchQueryContext = createContext('');

/** Hands the page's search text down to every `Highlight` in the lists, wherever it sits. */
export function SearchHighlightProvider({ query, children }: { query: string; children: ReactNode }) {
    return <SearchQueryContext.Provider value={query}>{children}</SearchQueryContext.Provider>;
}

/**
 * `text` with the parts the page's search found marked (`SEARCH_HIGHLIGHT_CLASS_NAME`). Outside a provider, or with no
 * search, the text stays plain.
 */
export function Highlight({ text }: { text: string }) {
    const query = useContext(SearchQueryContext);
    const matches = findMatches(text, query);
    if (matches.length === 0) return text;

    const parts: ReactNode[] = [];
    let end = 0;
    matches.forEach(([start, matchEnd]) => {
        if (start > end) parts.push(text.slice(end, start));
        parts.push(
            <mark key={start} className={SEARCH_HIGHLIGHT_CLASS_NAME}>
                {text.slice(start, matchEnd)}
            </mark>,
        );
        end = matchEnd;
    });
    if (end < text.length) parts.push(text.slice(end));
    return <>{parts}</>;
}

/** Whether the page's search found any part of `text`. */
export function useSearchFound(text: string): boolean {
    return findMatches(text, useContext(SearchQueryContext)).length > 0;
}
