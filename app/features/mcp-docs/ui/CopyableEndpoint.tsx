'use client';

import { Check, Copy, XCircle } from 'react-feather';

import { cn } from '@/app/components/shared/utils';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';

/** Endpoint URL as a link with an inline copy affordance, for the hero fact grid. */
export function CopyableEndpoint({ url }: { url: string }) {
    const [state, copy] = useCopyToClipboard(1000);

    const icon = {
        copied: <Check size={12} aria-hidden />,
        copy: <Copy size={12} aria-hidden />,
        errored: <XCircle size={12} aria-hidden />,
    }[state];

    // Inline flow (no flex wrapper): the link shares the fact's text-sm line box, so its
    // baseline matches the neighbouring facts; the fixed 20px button never grows the line.
    return (
        <>
            <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-dark-accent no-underline hover:underline"
            >
                {url}
            </a>
            <button
                type="button"
                aria-label="Copy endpoint to clipboard"
                onClick={() => copy(url)}
                className={cn(
                    'ml-1 inline-flex size-5 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 align-top',
                    'text-neutral-500 hover:bg-heavy-metal-800 hover:text-neutral-200',
                    state === 'copied' && 'text-dark-accent hover:text-dark-accent',
                    state === 'errored' && 'text-red-500 hover:text-red-500',
                )}
            >
                {icon}
            </button>
        </>
    );
}
