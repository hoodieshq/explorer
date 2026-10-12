import 'client-only';

import React from 'react';

/**
 * Escape in a search field with text clears the text instead of closing the panel around it; a second Escape closes
 * it. Radix listens for Escape on the document in the capture phase, so the field claims the key earlier, on the
 * window, and only while it is focused and holds text.
 */
export function useEscapeClearsQuery(
    inputRef: React.RefObject<HTMLInputElement | null>,
    query: string,
    setQuery: (query: string) => void,
) {
    React.useEffect(() => {
        if (query === '') return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || document.activeElement !== inputRef.current) return;
            event.stopPropagation();
            setQuery('');
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [inputRef, query, setQuery]);
}
