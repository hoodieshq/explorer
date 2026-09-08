// `client-only` (not 'use client'): a server caller then fails the build with an import trace instead of
// throwing at runtime.
import 'client-only';

import { useCallback, useEffect, useState } from 'react';

/**
 * Which design variant of a page is on screen while several variants coexist for review.
 *
 * The default variant renders on the server and on first paint; a variant id in the location hash
 * (e.g. `/tx/inspector#v2`) or the on-page {@link DesignVariantSwitcher} selects another. The hash is
 * read once after mount on purpose — reacting to every `hashchange` would flip the variant as soon as
 * an in-page anchor (`#accounts`, `#logs`) is clicked.
 */
export function useDesignVariant<T extends string>(
    variants: readonly T[],
    defaultVariant: T,
): [T, (variant: T) => void] {
    const [variant, setVariant] = useState<T>(defaultVariant);

    useEffect(() => {
        const hash = window.location.hash.slice(1);
        if ((variants as readonly string[]).includes(hash)) setVariant(hash as T);
        // Read once: `variants` is a module-level constant at every call site.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const select = useCallback(
        (next: T) => {
            setVariant(next);
            // Keep the URL shareable: the variant's hash while off the default, no hash on it.
            if (next === defaultVariant) {
                window.history.replaceState(undefined, '', window.location.pathname + window.location.search);
            } else {
                window.location.hash = next;
            }
        },
        [defaultVariant],
    );

    return [variant, select];
}
