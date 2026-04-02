'use client';

import { useCluster } from '@providers/cluster';
import React, { useState } from 'react';

import { useProgramCanonicalMetadata } from '@/app/entities/program-metadata/model/useProgramCanonicalMetadata';

interface CurrentContentProps {
    programAddress: string;
    seed: string;
}

export function CurrentContent({ programAddress, seed }: CurrentContentProps) {
    const { url, cluster } = useCluster();
    const { programMetadata } = useProgramCanonicalMetadata(programAddress, seed, url, cluster, true);
    const [isExpanded, setIsExpanded] = useState(false);

    if (!programMetadata) return undefined;

    const formatted = formatContent(programMetadata);
    const isLong = formatted.length > 500;
    const displayContent = isLong && !isExpanded ? formatted.slice(0, 500) + '…' : formatted;

    return (
        <div className="e-rounded-lg e-border e-border-solid e-border-heavy-metal-950 e-bg-heavy-metal-900">
            <div className="e-flex e-items-center e-justify-between e-border-b e-border-solid e-border-heavy-metal-950 e-px-4 e-py-3">
                <span className="e-text-sm e-font-medium e-text-neutral-200">
                    Current Content
                </span>
                <span className="e-text-xs e-text-neutral-500">
                    {seed}
                </span>
            </div>
            <pre className="e-m-0 e-max-h-[400px] e-overflow-auto e-whitespace-pre-wrap e-break-words e-p-4 e-font-mono e-text-xs e-text-neutral-300">
                {displayContent}
            </pre>
            {isLong && (
                <button
                    className="e-w-full e-appearance-none e-border-0 e-border-t e-border-solid e-border-heavy-metal-950 e-bg-transparent e-px-4 e-py-2 e-text-xs e-text-neutral-500 hover:e-text-neutral-300"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? 'Show less' : 'Show full content'}
                </button>
            )}
        </div>
    );
}

function formatContent(data: unknown): string {
    if (typeof data === 'string') return data;
    try {
        return JSON.stringify(data, undefined, 2);
    } catch {
        return String(data);
    }
}
