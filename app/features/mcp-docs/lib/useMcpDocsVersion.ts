'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mcp-docs-version';

export type McpDocsVersion = 'v1' | 'v2';

/**
 * Page-level prototype switcher: v1 is the shipped page, v2 is the trimmed
 * variant built from customer feedback. Persisted so the choice survives
 * navigation between the overview and the advanced page.
 */
export function useMcpDocsVersion(): [McpDocsVersion, (version: McpDocsVersion) => void] {
    // SSR always renders v1; the stored choice applies after mount.
    const [version, setVersion] = useState<McpDocsVersion>('v1');

    useEffect(() => {
        if (window.localStorage.getItem(STORAGE_KEY) === 'v2') {
            setVersion('v2');
        }
    }, []);

    const set = useCallback((next: McpDocsVersion) => {
        setVersion(next);
        window.localStorage.setItem(STORAGE_KEY, next);
    }, []);

    return [version, set];
}
