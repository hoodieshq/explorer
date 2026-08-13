'use client';

import {
    McpDocsOverviewView,
    McpDocsOverviewViewV2,
    useMcpDocsVersion,
    VersionSwitcher,
} from '@/app/features/mcp-docs';

export default function McpDocsPageClient() {
    const [version, setVersion] = useMcpDocsVersion();
    return (
        <>
            <div className="mx-auto w-full max-w-3xl px-4 pt-6">
                <VersionSwitcher value={version} onChange={setVersion} />
            </div>
            {version === 'v2' ? <McpDocsOverviewViewV2 /> : <McpDocsOverviewView />}
        </>
    );
}
