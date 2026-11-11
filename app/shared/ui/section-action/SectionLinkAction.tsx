'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { ExternalLink } from '@/app/components/shared/ui/external-link';

import { useSectionActionsVariant } from './model';

// REVIEW(home-key-value-cards): renders a section's title link per the design-menu variant; see `model.ts`.

/**
 * A section's title link. In the `icon` variant it is an icon button below `sm`, labelled for screen readers, and
 * `children` from `sm` up; in `wrap` it is `children` everywhere. `internal` keeps an in-app link in the same tab.
 */
export function SectionLinkAction({
    href,
    icon,
    label,
    internal = false,
    children,
}: {
    href: string;
    icon: ReactNode;
    label: string;
    internal?: boolean;
    children: ReactNode;
}) {
    const variant = useSectionActionsVariant();

    if (variant === 'wrap') return children;

    return (
        <>
            <Button variant="outline" size="icon" className="sm:hidden" asChild>
                {internal ? (
                    <Link href={href} aria-label={label} title={label}>
                        {icon}
                    </Link>
                ) : (
                    <ExternalLink href={href} aria-label={label} title={label}>
                        {icon}
                    </ExternalLink>
                )}
            </Button>
            <span className="hidden sm:inline">{children}</span>
        </>
    );
}
