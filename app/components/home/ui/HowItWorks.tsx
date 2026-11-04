'use client';

import { EXPLORER_REPO_URL } from '@components/navbar/shared';
import { ExternalLink } from '@components/shared/ui/external-link';

import { KICKER } from '../lib/tokens';

const POINTS = [
    {
        body: 'Every figure on this page is read live from an RPC node. No database or indexer sits in between, so what you see is the chain’s own answer.',
        title: 'Straight from the chain',
    },
    {
        body: 'Because there is no cache to disagree with, this is the explorer people open to settle it when two sources show different things.',
        title: 'A reliable tiebreaker',
    },
    {
        body: 'The same honesty is why some heavy lookups are slow — the node computes them on demand. Point the Explorer at your own RPC for full control.',
        title: 'Honest about the trade-off',
    },
];

export function HowItWorks() {
    return (
        <section
            aria-labelledby="home-how-heading"
            className="rounded-2xl border border-solid border-heavy-metal-950 bg-heavy-metal-900 p-6 sm:p-8"
        >
            <span className={KICKER}>How this explorer works</span>
            <h2
                id="home-how-heading"
                className="m-0 mt-2 max-w-2xl text-2xl font-normal leading-snug tracking-tight text-dark-foreground sm:text-3xl"
            >
                Open source, and reading the same chain you are
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {POINTS.map(point => (
                    <div key={point.title}>
                        <div className="text-base font-medium text-dark-foreground">{point.title}</div>
                        <p className="m-0 mt-2 text-sm leading-6 text-heavy-metal-300">{point.body}</p>
                    </div>
                ))}
            </div>

            <p className="m-0 mt-6 text-sm text-heavy-metal-400">
                Built in the open — read the source or file an issue on{' '}
                <ExternalLink href={EXPLORER_REPO_URL}>GitHub</ExternalLink>.
            </p>
        </section>
    );
}
