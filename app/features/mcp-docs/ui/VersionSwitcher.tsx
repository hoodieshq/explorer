'use client';

import React from 'react';

import { cn } from '@/app/components/shared/utils';

import type { McpDocsVersion } from '../lib/useMcpDocsVersion';

const VERSIONS: McpDocsVersion[] = ['v1', 'v2'];

/** Prototype toggle shown above the docs pages while the two variants coexist. */
export function VersionSwitcher({
    value,
    onChange,
}: {
    value: McpDocsVersion;
    onChange: (version: McpDocsVersion) => void;
}) {
    return (
        <div className="flex items-center justify-end gap-2">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Version</span>
            <div className="flex overflow-hidden rounded-lg border border-solid border-white/10">
                {VERSIONS.map(version => (
                    <button
                        key={version}
                        type="button"
                        onClick={() => onChange(version)}
                        className={cn(
                            'cursor-pointer border-0 px-3 py-1 text-xs font-medium uppercase transition-colors',
                            value === version
                                ? 'bg-heavy-metal-800 text-white'
                                : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                        )}
                    >
                        {version}
                    </button>
                ))}
            </div>
        </div>
    );
}
