'use client';

import { useCallback, useEffect, useState } from 'react';

export type McpDocsVersion = 'v1' | 'v2';

/**
 * V2 is the page everyone sees; the v1 prototype stays reachable only through
 * the `#v1` hash (…/mcp/docs#v1). The hash is read once after mount — reading
 * it on every hashchange would flip the version when in-page anchors like
 * `#setup` are clicked. SSR always renders v2.
 */
export function useMcpDocsVersion(): [McpDocsVersion, (version: McpDocsVersion) => void] {
    const [version, setVersion] = useState<McpDocsVersion>('v2');

    useEffect(() => {
        if (window.location.hash === '#v1') {
            setVersion('v1');
        }
    }, []);

    const set = useCallback((next: McpDocsVersion) => {
        setVersion(next);
        // Keep the URL shareable: #v1 while on v1, no hash on v2.
        if (next === 'v1') {
            window.location.hash = 'v1';
        } else {
            window.history.replaceState(undefined, '', window.location.pathname + window.location.search);
        }
    }, []);

    return [version, set];
}
