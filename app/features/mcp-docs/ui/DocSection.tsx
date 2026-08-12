import React, { ReactNode } from 'react';
import { Link as LinkIcon } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

/**
 * Anchor-addressable documentation section: the heading carries the id the
 * overview catalog links to, plus a hover anchor link for sharing.
 */
export function DocSection({
    anchor,
    title,
    children,
    hidden,
    kicker,
}: {
    anchor: string;
    title: string;
    children: ReactNode;
    hidden?: boolean;
    kicker?: string;
}) {
    return (
        <section id={anchor} hidden={hidden} className="scroll-mt-6">
            {kicker && <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">{kicker}</div>}
            <h2 className="group mb-5 mt-0 flex items-center gap-2 text-2xl font-semibold text-white">
                {title}
                <a
                    href={`#${anchor}`}
                    aria-label={`Link to ${title}`}
                    className="text-neutral-600 no-underline opacity-0 hover:text-neutral-300 group-hover:opacity-100"
                >
                    <LinkIcon size={14} aria-hidden />
                </a>
            </h2>
            <div className="flex flex-col gap-4 text-sm leading-relaxed text-neutral-300">{children}</div>
        </section>
    );
}

/** Inline code token styled for dark cards. */
export function InlineCode({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <code
            className={cn(
                'rounded bg-heavy-metal-900 px-1.5 py-0.5 font-mono text-xs text-neutral-200 [overflow-wrap:anywhere]',
                className,
            )}
        >
            {children}
        </code>
    );
}
