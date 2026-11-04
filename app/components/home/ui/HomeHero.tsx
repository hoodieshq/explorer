'use client';

import { cn } from '@components/shared/utils';

import { KICKER } from '../lib/tokens';
import { HomeSearch } from './HomeSearch';

const EXAMPLES = ['an address', 'a signature', 'a program', 'a block'];

// Static radial wash — no motion, just a soft green glow anchored top-left like the mcp/start page.
const WASH: React.CSSProperties = {
    backgroundImage: 'radial-gradient(ellipse 60% 45% at 50% 0%, #1DD79B26 0%, #1DD79B00 70%)',
    backgroundRepeat: 'no-repeat',
};

export function HomeHero() {
    return (
        <section aria-labelledby="home-hero-heading" className="relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={WASH} />

            <div className="mx-auto flex max-w-3xl flex-col items-center gap-7 px-1 pb-4 pt-10 text-center sm:gap-9 sm:pt-16">
                <span className={KICKER}>Official · Open source</span>

                <h1
                    id="home-hero-heading"
                    className="m-0 text-4xl font-normal leading-[1.05] tracking-tight text-dark-foreground sm:text-5xl lg:text-6xl"
                >
                    Read Solana straight from the chain
                </h1>

                <p className="m-0 max-w-xl text-base leading-7 text-heavy-metal-300 sm:text-lg">
                    No indexer, no middle layer — every number here comes live from an RPC node. The open-source
                    explorer people check when something looks wrong.
                </p>

                <div className="w-full max-w-2xl">
                    <HomeSearch />
                </div>

                <p className="m-0 flex flex-wrap items-center justify-center gap-2 text-sm text-heavy-metal-400">
                    <span className="text-heavy-metal-300">Try:</span>
                    {EXAMPLES.map(example => (
                        <span
                            key={example}
                            className={cn(
                                'bg-heavy-metal-800/60 rounded-full border border-solid border-outer-space-700',
                                'px-3 py-1 font-mono text-xs text-heavy-metal-200',
                            )}
                        >
                            {example}
                        </span>
                    ))}
                </p>
            </div>
        </section>
    );
}
