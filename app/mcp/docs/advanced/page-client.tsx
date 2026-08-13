'use client';

import { useClusterPath } from '@utils/url';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { McpDocsAdvancedView, useMcpDocsVersion, VersionSwitcher } from '@/app/features/mcp-docs';

export default function McpDocsAdvancedPageClient() {
    const [version, setVersion] = useMcpDocsVersion();
    const router = useRouter();
    const overviewPath = useClusterPath({ pathname: '/mcp/docs' });

    // V2 has no advanced page — the tool reference lives on the overview.
    useEffect(() => {
        if (version === 'v2') {
            router.replace(overviewPath);
        }
    }, [version, overviewPath, router]);

    if (version === 'v2') {
        return undefined;
    }

    return (
        <>
            <div className="mx-auto w-full max-w-5xl px-4 pt-6">
                <VersionSwitcher value={version} onChange={setVersion} />
            </div>
            <McpDocsAdvancedView />
        </>
    );
}
