'use client';

import { GravityCta } from '@features/mcp-docs/ui/GravityCta';
import { useBuildClusterPath } from '@utils/url';
import Link from 'next/link';
import { useRef } from 'react';

import { HomeSearch } from './HomeSearch';

// Real, recognisable mints so a visitor can click straight through to a populated page instead of
// reading a hint. Links are cluster-aware; these resolve on mainnet.
const EXAMPLES: { label: string; address: string }[] = [
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', label: 'USDC' },
    { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', label: 'JUP' },
    { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', label: 'BONK' },
    { address: 'So11111111111111111111111111111111111111112', label: 'Wrapped SOL' },
];

// Static green glow anchored top-centre; the drifting particle field (reused from the MCP hero) sits
// on top of it and gravitates toward the CTA.
const WASH: React.CSSProperties = {
    backgroundImage: 'radial-gradient(ellipse 60% 55% at 50% 0%, #1DD79B26 0%, #1DD79B00 70%)',
    backgroundRepeat: 'no-repeat',
};

export function HomeHero() {
    const fieldRef = useRef<HTMLElement>(null);
    const buildPath = useBuildClusterPath();

    return (
        <section ref={fieldRef} aria-labelledby="home-hero-heading" className="relative w-full overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={WASH} />

            <div className="relative z-[1] mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 pb-12 pt-10 text-center sm:gap-7 sm:pb-14 sm:pt-14">
                <h1
                    id="home-hero-heading"
                    className="m-0 text-4xl font-normal leading-[1.05] tracking-tight text-dark-foreground sm:text-5xl lg:text-6xl"
                >
                    Read Solana straight from the chain
                </h1>

                <p className="m-0 max-w-xl text-base leading-7 text-heavy-metal-300 sm:text-lg">
                    Explore accounts, transactions, blocks and tokens on any Solana cluster.
                </p>

                <div className="w-full max-w-2xl">
                    <HomeSearch />
                </div>

                <p className="m-0 flex flex-wrap items-center justify-center gap-2 text-sm text-heavy-metal-400">
                    <span className="text-heavy-metal-300">Try:</span>
                    {EXAMPLES.map(example => (
                        <Link
                            key={example.address}
                            href={buildPath(`/address/${example.address}`)}
                            className="bg-heavy-metal-800/60 rounded-full border border-solid border-outer-space-700 px-3 py-1 font-mono text-xs text-heavy-metal-200 no-underline transition-colors hover:border-dark-accent hover:text-dark-foreground"
                        >
                            {example.label}
                        </Link>
                    ))}
                </p>

                <GravityCta
                    href="#network"
                    fieldRef={fieldRef}
                    desktopScope="heroDesktop"
                    mobileScope="heroDesktop"
                    mobileDotScale={0.5}
                    mobilePullScale={0.5}
                    className="text-sm"
                    zoneTop={0.2}
                    zoneBottom={0.8}
                >
                    See the live network
                </GravityCta>
            </div>
        </section>
    );
}
