'use client';

import type { ComponentType } from 'react';

import {
    McpDocsOverviewView,
    McpDocsOverviewViewV3,
    McpDocsOverviewViewV32,
    type McpDocsVersion,
    useMcpDocsVersion,
    VersionSwitcher,
} from '@/app/features/mcp-docs';

const VIEWS: Record<McpDocsVersion, ComponentType> = {
    v2: McpDocsOverviewView,
    v3: McpDocsOverviewViewV3,
    'v3.2': McpDocsOverviewViewV32,
};

export default function McpDocsPageClient() {
    const [version, setVersion] = useMcpDocsVersion();
    const View = VIEWS[version];

    // v3/v3.2 are full-bleed dark; the shipped v2 keeps the app's default surface.
    const dark = version !== 'v2';

    return (
        // `relative` anchors the draggable switcher plate to this page surface. The dark variants
        // also get the near-black band and `-mb-6` so the last band meets the footer with no gap.
        <div className={dark ? 'relative -mb-6 bg-[#0A0E0D]' : 'relative'}>
            <VersionSwitcher value={version} onChange={setVersion} />
            <View />
        </div>
    );
}
