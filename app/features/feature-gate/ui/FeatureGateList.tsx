'use client';

import { cva } from 'class-variance-authority';
import Link from 'next/link';
import React, { type ReactNode } from 'react';

import { AddressLink } from '@/app/components/shared/address';
import { Button } from '@/app/components/shared/ui/button';
import { cn } from '@/app/components/shared/utils';
import { SortIndicator } from '@/app/shared/ui/SortIndicator';
import { Cluster, clusterName, clusterSlug } from '@/app/utils/cluster';

import type { ClusterActivation } from '../lib/partition-features';
import type { SortDirection } from '../lib/sort-activated-features';
import { stripSimdPrefix } from '../lib/strip-simd-prefix';
import { LINK_CLASS_NAME } from './ClusterEpoch';
import type { FeatureRow } from './FeatureGateTable';
import { Highlight, useSearchFound } from './SearchHighlight';
import { SimdLinks } from './SimdLinks';

// REVIEW(HOO-926): the feed variant of the feature-gate lists, picked in the design menu; remove it or the table
// before the external PR.

/**
 * Feature gates as a feed of records, everything in view at once: the title with its SIMDs, the description, and a
 * status line with the activation and the key.
 */
export function FeatureGateList<T extends FeatureRow>({
    features,
    cluster,
    status,
    emptyState,
    header,
    footer,
}: {
    features: T[];
    cluster: Cluster;
    /** The record's status line: where the feature stands on this cluster. */
    status: (feature: T) => ReactNode;
    /** Rendered in place of the list when `features` is empty; without one it renders nothing. */
    emptyState?: ReactNode;
    /** Optional content rendered above the records, inside the card. */
    header?: ReactNode;
    /** Optional content rendered below the records, inside the card. */
    footer?: ReactNode;
}) {
    if (features.length === 0) return emptyState;

    return (
        // No card and no dividers from `lg`: the records lie on the page itself, set apart by space alone.
        <div>
            {header}
            {/* From `lg`, `pt-5` adds to the section's 12px title gap, so the first record sits 32px under the title
                (or the home block's header), clear of it like the records are of each other. Below `lg` the records
                are cards, 8px apart like the other lists' cards. */}
            <ul className="m-0 flex list-none flex-col gap-2 p-0 lg:gap-10 lg:pt-5">
                {features.map(feature => (
                    <FeatureRecord key={feature.key} feature={feature} cluster={cluster} status={status(feature)} />
                ))}
            </ul>
            {footer}
        </div>
    );
}

/** A status line's state marker and text, followed by the rest of the line. */
export function StatusLine({ tone, children }: { tone: 'active' | 'pending' | 'scheduled'; children: ReactNode }) {
    return (
        <span className="inline-flex items-baseline gap-2">
            <span aria-hidden className={statusDotVariants({ tone })} />
            <span>{children}</span>
        </span>
    );
}

/** Upcoming status: not on this cluster yet, with the epochs it activated at elsewhere. */
export function UpcomingStatus({ activations }: { activations: ClusterActivation[] }) {
    return (
        <StatusLine tone="pending">
            Not active yet
            {activations.map(({ cluster, epoch }) => (
                <React.Fragment key={cluster}>
                    {' · '}
                    {clusterName(cluster)}{' '}
                    <Link href={`/epoch/${epoch}?cluster=${clusterSlug(cluster)}`} className={LINK_CLASS_NAME}>
                        <Highlight text={String(epoch)} />
                    </Link>
                </React.Fragment>
            ))}
        </StatusLine>
    );
}

/** Section action that flips the list's order; the caller owns the order of `features`. */
export function SortToggle({
    label,
    direction,
    onToggle,
}: {
    label: string;
    direction: SortDirection;
    onToggle: () => void;
}) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-label={`${label}: ${direction === 'desc' ? 'newest first' : 'oldest first'}`}
            className="gap-2"
        >
            {label}
            <SortIndicator active direction={direction} />
        </Button>
    );
}

// The key only tells features apart and gets copied, so it reads head…tail; the full key stays in the link's
// tooltip and in the copy button.
const KEY_TRUNCATE = { head: 4, tail: 4 };

// Lifts a mobile card's own links above the title's stretched link.
// The config has no `max-lg` screen, so the card styles are the base and `lg:` undoes them.
const CARD_CONTROL = 'relative z-10 lg:static lg:z-auto';

// The key is left to the feature's page on mobile, unless the search found it there: then it shows, marked, on the
// card's last line.
const keyVariants = cva('', { variants: { onMobile: { false: 'hidden lg:block', true: 'block' } } });

const statusDotVariants = cva('size-2 shrink-0 self-center rounded-full', {
    variants: {
        tone: {
            active: 'bg-accent',
            pending: 'bg-outer-space-500',
            // Hollow: the epoch is set but hasn't come yet.
            scheduled: 'border border-solid border-accent bg-transparent',
        },
    },
});

function FeatureRecord({ feature, cluster, status }: { feature: FeatureRow; cluster: Cluster; status: ReactNode }) {
    // The badges in front carry the SIMD numbers, so a title that opens with them drops that lead. Without badges the
    // lead stays, so no number goes missing.
    const title = feature.simdEntries.length > 0 ? stripSimdPrefix(feature.title) : feature.title;
    const keyFound = useSearchFound(feature.key);

    return (
        <li className="relative flex flex-col gap-2 rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            {/* Styled like the instruction cards' title (medium, 1.1 line height, tight tracking) one step up, at
                16px; the SIMDs sit in the place of the instruction's `#N` badge. Below `lg` they head the card on a
                line of their own. */}
            <h3 className="m-0 flex min-w-0 flex-col items-start gap-x-1.5 gap-y-1 text-base font-medium leading-[1.1] tracking-[-0.02em] text-white lg:flex-row lg:flex-wrap lg:items-baseline">
                <span className={cn(CARD_CONTROL, 'empty:hidden')}>
                    <SimdLinks entries={feature.simdEntries} />
                </span>
                {/* Below `lg` the link stretches over the card through `::after`, so a tap anywhere on it opens
                    the feature; the SIMDs and the status line sit above that layer and keep their own links. */}
                <Link
                    href={`/address/${feature.key}/feature-gate?cluster=${clusterSlug(cluster)}`}
                    className="min-w-0 text-white [overflow-wrap:anywhere] after:absolute after:inset-0 after:content-[''] hover:text-dark-accent hover:underline lg:after:content-none"
                >
                    <Highlight text={title} />
                </Link>
            </h3>
            {feature.description && (
                <p className="m-0 max-w-[48rem] text-sm leading-normal text-outer-space-100 [overflow-wrap:anywhere]">
                    <Highlight text={feature.description} />
                </p>
            )}
            {/* `self-start` keeps the raised line as wide as its text, so the rest of its row still opens the card. */}
            <div
                className={cn(
                    'flex flex-wrap items-baseline gap-x-4 gap-y-1 self-start text-sm text-outer-space-300',
                    CARD_CONTROL,
                )}
            >
                {status}
                <span className={keyVariants({ onMobile: keyFound })}>
                    <AddressLink address={feature.key} truncate={KEY_TRUNCATE} highlighted={keyFound} />
                </span>
            </div>
        </li>
    );
}
