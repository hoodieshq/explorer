import { cva } from 'class-variance-authority';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { ExternalLink } from '@/app/components/shared/ui/external-link';

import type { SimdEntry } from '../lib/partition-features';
import { Highlight } from './SearchHighlight';

// The badges take the plain badge shape of the token Extensions row (12px type, `rounded-md`) in the info teal.
//
// `stack` puts one badge per line from `lg`, so a table column sized to its content stays one badge wide however
// many SIMDs a feature lists; below `lg` the badges head a card and wrap in a line.
const simdLinksVariants = cva('flex gap-1', {
    defaultVariants: { layout: 'wrap' },
    variants: {
        layout: {
            stack: 'flex-wrap lg:flex-col lg:items-start',
            wrap: 'flex-wrap',
        },
    },
});

export function SimdLinks({ entries, layout }: { entries: SimdEntry[]; layout?: 'stack' | 'wrap' }) {
    if (entries.length === 0) return undefined;
    return (
        <div className={simdLinksVariants({ layout })}>
            {entries.map(({ simd, link }, index) => (
                <Badge key={`${simd}-${index}`} variant="info" asChild>
                    <ExternalLink href={link}>
                        {/* Only the number: the search matches SIMDs by number, not by the word. */}
                        SIMD <Highlight text={simd.padStart(4, '0')} />
                    </ExternalLink>
                </Badge>
            ))}
        </div>
    );
}
