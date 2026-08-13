'use client';

import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { ArrowRight, Minus, Plus, Tool } from 'react-feather';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/shared/ui/accordion';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { cn } from '@/app/components/shared/utils';

import { ADVANCED_CHUNKS } from '../lib/advanced-chunks';
import { AGENT_INSTRUCTIONS_SNIPPET, AGENT_INSTRUCTIONS_TARGETS, SETUP_CLIENTS } from '../lib/setup-clients';
import { useDeploymentOrigin } from '../lib/useDeploymentOrigin';
import { CodeBlock } from './CodeBlock';
import { CopyableEndpoint } from './CopyableEndpoint';
import { DocCard } from './DocCard';
import { InlineCode } from './DocSection';

const HIGHLIGHTS = [
    {
        text: 'Pass any base58 string — the tool detects whether it is a 32-byte account address or a 64-byte transaction signature and returns a typed payload.',
        title: 'One identifier in, structured entity out',
    },
    {
        text: 'Mints, token accounts and multisigs for both SPL Token and Token-2022 (including parsed extensions), plus compressed NFTs.',
        title: 'Deep token support',
    },
    {
        text: 'Status, fee, signers, v0 lookup-table attribution, and instructions decoded through a cascade: on-chain IDL → bundled parsers → raw base58.',
        title: 'Full transaction decode',
    },
    {
        text: 'Upgradeability, upgrade authority, last deploy slot, and IDL availability for upgradeable programs.',
        title: 'Program inspection',
    },
    {
        text: 'Unresolvable fields come back as explicit unknown markers, never silently omitted; errors are structured codes, not prose.',
        title: 'Honest output',
    },
    {
        text: 'mainnet-beta (default), devnet, testnet and simd296 — pick per call with the cluster argument.',
        title: 'Four clusters',
    },
];

const EXAMPLES = [
    {
        answer: 'This is a token mint (kind spl-token:mint) with 6 decimals. Supply is variable: the mint authority is still active, and a freeze authority is set.',
        label: 'Token due diligence',
        question: 'What are the mint and freeze authorities of EPjF…t1v?',
        tool: 'inspect_entity',
    },
    {
        answer: 'The transaction failed in instruction #3 with a custom program error; the fee was still charged. Full decoded instructions (with inner instructions), signers and account list are in the payload.',
        label: 'Transaction post-mortem',
        question: 'Why did transaction 5UfD… fail?',
        tool: 'inspect_entity',
    },
    {
        answer: 'Yes — it is a bpf-upgradeable-loader program. The payload names the upgrade authority, the last deploy slot, and reports that an on-chain IDL is published.',
        label: 'Program inspection',
        question: 'Is program JUP6… upgradeable and who holds the upgrade authority?',
        tool: 'inspect_entity',
    },
    {
        answer: 'The account kind is unknown, but its owner program publishes an IDL, so the raw data comes back decoded through it (source "idl") instead of base64.',
        label: 'Unknown account decoding',
        question: 'What is stored in account 9xQe…?',
        tool: 'inspect_entity',
    },
    {
        answer: 'pong — transport, auth and (on previews) the protection bypass all work end-to-end.',
        label: 'Health check',
        question: 'Is the Explorer MCP up?',
        tool: 'ping',
    },
];

export function McpDocsOverviewView() {
    const origin = useDeploymentOrigin();
    const advancedPath = useClusterPath({ pathname: '/mcp/docs/advanced' });
    const [client, setClient] = useState(SETUP_CLIENTS[0].id);
    const [openHighlights, setOpenHighlights] = useState<string[]>([]);

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
            {/* Hero */}
            <h1 className="mb-4 mt-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Live on-chain data for coding agents
            </h1>
            <p className="mb-6 mt-0 text-lg leading-relaxed text-neutral-300">
                This Explorer ships a remote MCP (Model Context Protocol) server that lets AI agents inspect any Solana
                account, program, token, or transaction — decoded and enriched the same way the Explorer UI renders it.
            </p>
            <div className="mb-8 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg" style={{ paddingInline: '1rem' }}>
                    <a href="#setup" className="no-underline">
                        Set up your agent
                    </a>
                </Button>
                <Button asChild variant="outline" size="lg" style={{ paddingInline: '1rem' }}>
                    <Link href={advancedPath} className="no-underline">
                        Advanced reference
                    </Link>
                </Button>
            </div>
            <DocCard transparent className="mb-12">
                <div className="grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:p-6">
                    <HeroFact label="Endpoint">
                        <CopyableEndpoint url={`${origin}/mcp`} />
                    </HeroFact>
                    <HeroFact label="Transport">
                        <span className="font-mono text-xs">Streamable HTTP, stateless</span>
                    </HeroFact>
                    <HeroFact label="Auth">
                        <span className="font-mono text-xs">Authorization: Bearer &lt;key&gt;</span>
                    </HeroFact>
                    <HeroFact label="Tools">
                        <span className="font-mono text-xs">inspect_entity · ping</span>
                    </HeroFact>
                </div>
            </DocCard>

            {/* Highlights */}
            <SectionTitle subtitle="What the server gives your agent out of the box.">Highlights</SectionTitle>
            <Accordion
                type="multiple"
                value={openHighlights}
                onValueChange={setOpenHighlights}
                className="mb-12 grid items-start gap-3 sm:grid-cols-2"
            >
                {HIGHLIGHTS.map(highlight => (
                    <DocCard
                        key={highlight.title}
                        transparent
                        className={cn(
                            'overflow-hidden transition-colors hover:border-dark-accent',
                            openHighlights.includes(highlight.title) && 'cursor-pointer',
                        )}
                        // Deliberately reads the pre-click state: a trigger click on a closed item bubbles here,
                        // and a functional update would instantly undo the open.
                        onClick={() => {
                            if (openHighlights.includes(highlight.title)) {
                                setOpenHighlights(openHighlights.filter(value => value !== highlight.title));
                            }
                        }}
                    >
                        {/* The item is the card's only child, so its own `last:border-b-0` removes the divider. */}
                        <AccordionItem value={highlight.title} className="sm:px-6">
                            {/* Chevron off, +/- state icons on the right instead; no hover underline. */}
                            <AccordionTrigger className="px-0 text-base font-medium text-white hover:no-underline [&>svg]:hidden [&[data-state=closed]_.hl-minus]:hidden [&[data-state=open]_.hl-plus]:hidden">
                                <span className="flex-1">{highlight.title}</span>
                                <span className="hl-plus text-neutral-500">
                                    <Plus size={16} aria-hidden />
                                </span>
                                <span className="hl-minus text-neutral-500">
                                    <Minus size={16} aria-hidden />
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="text-sm leading-relaxed text-neutral-400">
                                {highlight.text}
                            </AccordionContent>
                        </AccordionItem>
                    </DocCard>
                ))}
            </Accordion>

            {/* Setup */}
            <SectionTitle
                id="setup"
                subtitle="Pick your tool, copy the config — snippets already point at this deployment. Ask the deployment owner for a key; some deployments run open access."
            >
                Setup
            </SectionTitle>
            <DocCard className="mb-12 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
                <Tabs value={client} onValueChange={setClient}>
                    <TabsList
                        style={{ display: 'flex' }}
                        className="-mx-4 mb-4 flex-nowrap gap-x-5 overflow-x-auto border-b border-white/10 px-4 sm:-mx-6 sm:px-6"
                    >
                        {SETUP_CLIENTS.map(({ id, label }) => (
                            <TabsTrigger key={id} value={id} className="shrink-0 whitespace-nowrap">
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {SETUP_CLIENTS.map(setupClient => (
                        <TabsContent key={setupClient.id} value={setupClient.id}>
                            <p className="mb-3 mt-0 text-sm text-neutral-300">{setupClient.where}</p>
                            <CodeBlock code={setupClient.snippet(origin)} />
                            <p className="mb-0 mt-3 text-sm leading-relaxed text-neutral-300">
                                <span className="font-medium text-neutral-300">Verify:</span> {setupClient.verify}
                            </p>
                        </TabsContent>
                    ))}
                </Tabs>
                <p className="mb-0 mt-4 text-sm leading-relaxed text-neutral-300">
                    Connecting to a preview deployment? Previews need one extra header —{' '}
                    <Link
                        href={`${advancedPath}#preview-deployments`}
                        className="text-dark-accent no-underline hover:underline"
                    >
                        see preview deployments
                    </Link>
                    .
                </p>
            </DocCard>

            {/* Agent instructions */}
            <SectionTitle subtitle="Teach the agent to reach for the Explorer instead of guessing — add the block below to the instructions file your tool reads.">
                Agent instructions
            </SectionTitle>
            <DocCard className="mb-12 overflow-hidden">
                <ul className="m-0 flex list-none flex-col gap-1 p-4 text-sm text-neutral-300 sm:p-6">
                    {AGENT_INSTRUCTIONS_TARGETS.map(target => (
                        <li key={target.file}>
                            <InlineCode>{target.file}</InlineCode>
                            <span className="text-neutral-500"> — {target.tool}</span>
                        </li>
                    ))}
                </ul>
                {/* Snippet as the card's bottom segment behind a full-width divider (no nested card). */}
                <div className="border-0 border-t border-solid border-white/10">
                    <CodeBlock variant="flush" code={AGENT_INSTRUCTIONS_SNIPPET} />
                </div>
            </DocCard>

            {/* Examples */}
            <SectionTitle subtitle="How a conversation with a connected agent actually looks.">Examples</SectionTitle>
            <ExamplesCarousel />

            {/* Advanced catalog */}
            <SectionTitle subtitle="Operational and reference chunks on the advanced page — each card says who it is for and what it gives.">
                Going deeper
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
                {ADVANCED_CHUNKS.map(chunk => (
                    <Link key={chunk.anchor} href={`${advancedPath}#${chunk.anchor}`} className="group no-underline">
                        <DocCard transparent className="h-full transition-colors group-hover:border-dark-accent">
                            <div className="flex h-full flex-col p-4 sm:p-6">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-base font-medium text-white">{chunk.title}</span>
                                    <ArrowRight
                                        size={14}
                                        aria-hidden
                                        className="shrink-0 text-neutral-600 transition-colors group-hover:text-dark-accent"
                                    />
                                </div>
                                <div className="text-sm leading-relaxed text-neutral-400">{chunk.gives}</div>
                                <div className="mt-auto self-start pt-3">
                                    {/* No outline variant in the tw Badge set — transparent + inline border (cn keeps conflicting border-color classes). */}
                                    <Badge
                                        variant="transparent"
                                        size="xs"
                                        style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
                                    >
                                        {chunk.audience}
                                    </Badge>
                                </div>
                            </div>
                        </DocCard>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function SectionTitle({ children, id, subtitle }: { children: React.ReactNode; id?: string; subtitle?: string }) {
    return (
        <div className="mb-5 scroll-mt-6" id={id}>
            <h2 className="m-0 text-2xl font-semibold text-white">{children}</h2>
            {subtitle && <p className="mb-0 mt-1.5 text-sm text-neutral-300">{subtitle}</p>}
        </div>
    );
}

const EXAMPLE_ROTATION_MS = 6000;

/**
 * Chat-app layout: example titles as a "chat list" beside a vertical divider,
 * the selected conversation on the right. Auto-advances; hover pauses; a click
 * selects. Conversations are stacked in one grid cell so the card keeps the
 * height of the tallest one.
 */
function ExamplesCarousel() {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) {
            return;
        }
        const timer = setInterval(() => setIndex(current => (current + 1) % EXAMPLES.length), EXAMPLE_ROTATION_MS);
        return () => clearInterval(timer);
        // `index` restarts the timer after a manual selection so the next auto-advance waits a full period.
    }, [paused, index]);

    return (
        <DocCard
            className="mb-12 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="flex flex-col sm:flex-row">
                {/* Chat list */}
                <div
                    role="tablist"
                    aria-label="Examples"
                    className="flex shrink-0 flex-col border-0 border-b border-solid border-white/10 py-2.5 sm:w-52 sm:border-b-0 sm:border-r sm:py-3"
                >
                    {EXAMPLES.map((example, exampleIndex) => {
                        const active = exampleIndex === index;
                        return (
                            <button
                                key={example.label}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setIndex(exampleIndex)}
                                className={cn(
                                    'cursor-pointer border-0 bg-transparent px-4 py-2.5 text-left text-sm sm:py-3',
                                    'border-solid transition-colors',
                                    // Active marker: left bar, both in the stacked (mobile) and the sidebar (desktop) list.
                                    'border-l-2',
                                    active
                                        ? 'border-dark-accent bg-heavy-metal-900 text-white'
                                        : 'border-transparent text-neutral-400 hover:bg-heavy-metal-900 hover:text-neutral-200',
                                )}
                            >
                                {example.label}
                            </button>
                        );
                    })}
                </div>

                {/* Conversation view */}
                <div className="grid min-w-0 grow">
                    {EXAMPLES.map((example, exampleIndex) => {
                        const active = exampleIndex === index;
                        return (
                            <div
                                key={example.label}
                                aria-hidden={!active}
                                className={cn(
                                    'col-start-1 row-start-1 flex flex-col justify-end gap-2 p-4 transition-opacity duration-500 sm:p-6',
                                    active ? 'opacity-100' : 'pointer-events-none opacity-0',
                                )}
                            >
                                <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-heavy-metal-700 px-4 py-2.5 text-sm leading-relaxed text-white">
                                    {example.question}
                                </div>
                                <div className="flex items-center gap-1.5 self-start px-1 text-xs text-neutral-500">
                                    <Tool size={12} aria-hidden />
                                    <span>
                                        Ran <span className="font-mono text-neutral-400">{example.tool}</span> ·
                                        Explorer MCP
                                    </span>
                                </div>
                                <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-solid border-white/10 bg-heavy-metal-900 px-4 py-2.5 text-sm leading-relaxed text-neutral-300">
                                    {example.answer}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DocCard>
    );
}

function HeroFact({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
            <span className="truncate text-sm text-neutral-200">{children}</span>
        </div>
    );
}
