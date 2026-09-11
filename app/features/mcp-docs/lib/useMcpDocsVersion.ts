'use client';

import { useCallback, useEffect, useState } from 'react';

export const MCP_DOCS_VERSIONS = ['v2', 'v3', 'v3.2'] as const;

export type McpDocsVersion = (typeof MCP_DOCS_VERSIONS)[number];

const DEFAULT_VERSION: McpDocsVersion = 'v2';

function isVersion(value: string): value is McpDocsVersion {
    return (MCP_DOCS_VERSIONS as readonly string[]).includes(value);
}

/**
 * Which design variant of the docs page is on screen. The shipped v2 is the default;
 * the dark-editorial v3 and v3.2 are reachable through the hash (…/mcp/docs#v3) and the
 * on-page switcher. The hash is read once after mount — reading it on every hashchange
 * would flip the variant when in-page anchors like `#setup` are clicked. SSR always
 * renders the default.
 */
export function useMcpDocsVersion(): [McpDocsVersion, (version: McpDocsVersion) => void] {
    const [version, setVersion] = useState<McpDocsVersion>(DEFAULT_VERSION);

    useEffect(() => {
        const hash = window.location.hash.slice(1);
        if (isVersion(hash)) {
            setVersion(hash);
        }
    }, []);

    const set = useCallback((next: McpDocsVersion) => {
        setVersion(next);
        // Keep the URL shareable: the variant's hash while off the default, no hash on it.
        if (next === DEFAULT_VERSION) {
            window.history.replaceState(undefined, '', window.location.pathname + window.location.search);
        } else {
            window.location.hash = next;
        }
    }, []);

    return [version, set];
}
