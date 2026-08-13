'use client';

import { useClusterPath } from '@utils/url';
import { useRouter } from 'next/navigation';

import { McpDocsAdvancedView, VersionSwitcher } from '@/app/features/mcp-docs';

// The advanced reference is part of the hidden v1 prototype: nothing on the
// shipped v2 page links here, and this page's hash is taken by its own section
// anchors, so it renders unconditionally. The switcher only offers the way out.
export default function McpDocsAdvancedPageClient() {
    const router = useRouter();
    const overviewPath = useClusterPath({ pathname: '/mcp/docs' });

    return (
        <>
            <div className="mx-auto w-full max-w-5xl px-4 pt-6">
                <VersionSwitcher
                    value="v1"
                    onChange={version => {
                        if (version === 'v2') {
                            router.push(overviewPath);
                        }
                    }}
                />
            </div>
            <McpDocsAdvancedView />
        </>
    );
}
