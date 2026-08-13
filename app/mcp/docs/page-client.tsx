'use client';

import {
    McpDocsOverviewView,
    McpDocsOverviewViewV2,
    useMcpDocsVersion,
    VersionSwitcher,
} from '@/app/features/mcp-docs';

export default function McpDocsPageClient() {
    const [version, setVersion] = useMcpDocsVersion();

    // The v1 prototype is hidden behind the #v1 hash; only there does the switcher show up.
    if (version === 'v1') {
        return (
            <>
                <div className="mx-auto w-full max-w-3xl px-4 pt-6">
                    <VersionSwitcher value={version} onChange={setVersion} />
                </div>
                <McpDocsOverviewView />
            </>
        );
    }
    return <McpDocsOverviewViewV2 />;
}
