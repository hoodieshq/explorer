'use client';

import { createContext, type ReactNode, useContext } from 'react';

type Mark = (value: ReactNode) => ReactNode;

const MarkContext = createContext<Mark | undefined>(undefined);

/**
 * Says how values rendered below are marked, e.g. a user-supplied IDL's yellow background. Generic so shared
 * cells and entity cards can mark their values without knowing what the mark means. `undefined` clears an
 * outer mark, so a nested card never inherits its parent's.
 */
export function ValueMarkProvider({ mark, children }: { mark: Mark | undefined; children: ReactNode }) {
    return <MarkContext.Provider value={mark}>{children}</MarkContext.Provider>;
}

/** A value under the nearest `ValueMarkProvider`'s mark; unmarked when there is none. */
export function MarkedValue({ children }: { children: ReactNode }) {
    const mark = useContext(MarkContext);
    return mark ? mark(children) : children;
}
