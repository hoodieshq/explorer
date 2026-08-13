'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Plus, Tool } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { cn } from '@/app/components/shared/utils';

import { AGENT_INSTRUCTIONS_SNIPPET, AGENT_INSTRUCTIONS_TARGETS, SETUP_CLIENTS_OPEN } from '../lib/setup-clients';
import { useDeploymentOrigin } from '../lib/useDeploymentOrigin';
import { CodeBlock } from './CodeBlock';
import { DocCard } from './DocCard';
import { InlineCode } from './DocSection';

// Real entities only (customer feedback: "make the example actual examples").
const EXAMPLES = [
    {
        answer: 'USDC — an spl-token:mint with 6 decimals and variable supply. The mint authority (BJE5MMbq…5ruG) is still active and a freeze authority (7dGbd2QZ…Crar) is set.',
        label: 'Token mint',
        question: 'What are the mint authority, supply and decimals of EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?',
        tool: 'inspect_entity',
    },
    {
        answer: 'SQDS4ep6…pCf is an upgradeable program (bpf-upgradeable-loader). The payload names its upgrade authority and last deploy slot, and reports the on-chain Anchor IDL it publishes.',
        label: 'Program inspection',
        question: 'Inspect SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf — is it upgradeable and does it publish an IDL?',
        tool: 'inspect_entity',
    },
    {
        answer: 'Every instruction comes back decoded — program name, typed args and accounts — with inner instructions nested under their parent. Programs publishing an on-chain IDL decode through it; token instructions decode through bundled parsers; the rest stay labeled raw.',
        label: 'Transaction walkthrough',
        question:
            'Walk me through this transaction signature instruction by instruction, including inner instructions.',
        tool: 'inspect_entity',
    },
    {
        answer: 'The mint payload lists each parsed Token-2022 extension with its current config and its authority, so you can tell which knobs are still live and who holds them.',
        label: 'Token-2022 extensions',
        question: 'Which Token-2022 extensions are enabled on this mint, and who can still change them?',
        tool: 'inspect_entity',
    },
];

const INSPECT_ENTITY_COVERS = [
    'SPL Token and Token-2022 mints, token accounts and multisigs, including parsed Token-2022 extensions.',
    'Upgradeable programs — upgradeability, upgrade authority, last deploy slot and on-chain IDL discovery.',
    'Stake, vote, nonce, sysvar, config, address lookup table and feature accounts.',
    'Compressed NFTs, nftoken accounts and Solana Attestation Service accounts.',
    'Transactions — signers, fee, status and instructions with inner instructions, decoded through IDL, bundled and raw sources.',
    'Accounts of unrecognised programs, decoded through the owner program’s on-chain IDL when it publishes one.',
];

// A real reply: USDC mint on mainnet-beta.
const INSPECT_ENTITY_RESPONSE = `{
    "payload": {
        "entity": {
            "kind": "spl-token:mint",
            "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "decimals": 6,
            "freeze_authority": "7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar",
            "is_initialized": true,
            "mint_authority": "BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG",
            "supply": "7902797573976355",
            "supply_type": "variable",
            "token_program": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
    },
    "errors": []
}`;

type EndpointStatus = { state: 'checking' | 'ready' | 'disabled'; ms?: number };

export function McpDocsOverviewViewV2() {
    const origin = useDeploymentOrigin();
    const [client, setClient] = useState(SETUP_CLIENTS_OPEN[0].id);
    const [status, setStatus] = useState<EndpointStatus>({ state: 'checking' });

    // Live health probe: any non-503 answer from /mcp means the endpoint is up.
    useEffect(() => {
        const started = performance.now();
        fetch('/mcp')
            .then(response =>
                setStatus({
                    ms: Math.round(performance.now() - started),
                    state: response.status === 503 ? 'disabled' : 'ready',
                }),
            )
            .catch(() => setStatus({ state: 'disabled' }));
    }, []);

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
            {/* Hero */}
            <h1 className="mb-4 mt-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Live on-chain data for coding agents
            </h1>
            <p className="mb-6 mt-0 text-lg leading-relaxed text-neutral-300">
                Connect your MCP client to the Explorer and let your agent read decoded on-chain state — accounts,
                programs, tokens and transactions — with the same IDL decoding and enrichments the Explorer renders.
            </p>
            <div className="mb-8 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg" style={{ paddingInline: '1rem' }}>
                    <a href="#setup" className="no-underline">
                        Set up your agent
                    </a>
                </Button>
                <Button asChild variant="outline" size="lg" style={{ paddingInline: '1rem' }}>
                    <a href="#tools" className="no-underline">
                        Browse the tools
                    </a>
                </Button>
            </div>
            <DocCard transparent className="mb-12">
                <div className="grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:p-6">
                    <HeroFact label="Status">
                        <StatusValue status={status} />
                    </HeroFact>
                    <HeroFact label="Endpoint">
                        <span className="font-mono text-xs">{origin}/mcp</span>
                    </HeroFact>
                    <HeroFact label="Transport">
                        <span className="font-mono text-xs">Streamable HTTP, stateless</span>
                    </HeroFact>
                    <HeroFact label="Auth">
                        <span className="font-mono text-xs">Open — no key required</span>
                    </HeroFact>
                    <HeroFact label="Clusters">
                        <span className="font-mono text-xs">mainnet-beta · devnet · testnet · simd296</span>
                    </HeroFact>
                    <HeroFact label="Tools">
                        <span className="font-mono text-xs">inspect_entity · ping</span>
                    </HeroFact>
                </div>
            </DocCard>

            {/* Setup */}
            <SectionTitle
                id="setup"
                subtitle="Pick your tool, copy the config — snippets already point at this deployment. No API key needed."
            >
                Setup
            </SectionTitle>
            <DocCard className="mb-12 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
                <Tabs value={client} onValueChange={setClient}>
                    <TabsList
                        style={{ display: 'flex' }}
                        className="-mx-4 mb-4 flex-nowrap gap-x-5 overflow-x-auto border-b border-white/10 px-4 sm:-mx-6 sm:px-6"
                    >
                        {SETUP_CLIENTS_OPEN.map(({ id, label }) => (
                            <TabsTrigger key={id} value={id} className="shrink-0 whitespace-nowrap">
                                {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {SETUP_CLIENTS_OPEN.map(setupClient => (
                        <TabsContent key={setupClient.id} value={setupClient.id}>
                            <p className="mb-3 mt-0 text-sm text-neutral-300">{setupClient.where}</p>
                            <CodeBlock code={setupClient.snippet(origin)} />
                            <p className="mb-0 mt-3 text-sm leading-relaxed text-neutral-300">
                                <span className="font-medium text-neutral-300">Verify:</span> {setupClient.verify}
                            </p>
                        </TabsContent>
                    ))}
                </Tabs>
            </DocCard>

            {/* Agent instructions */}
            <SectionTitle subtitle="Teach the agent to reach for the Explorer instead of guessing — add the block below to the instructions file your tool reads.">
                Agent instructions
            </SectionTitle>
            <DocCard className="mb-12 overflow-hidden">
                <p className="m-0 p-4 text-sm text-neutral-300 sm:p-6">
                    {AGENT_INSTRUCTIONS_TARGETS.map((target, index) => (
                        <React.Fragment key={target.file}>
                            {index > 0 && <span className="text-neutral-500"> / </span>}
                            <InlineCode>{target.file}</InlineCode>
                        </React.Fragment>
                    ))}
                </p>
                {/* Snippet as the card's bottom segment behind a full-width divider (no nested card). */}
                <div className="border-0 border-t border-solid border-white/10">
                    <CodeBlock variant="flush" code={AGENT_INSTRUCTIONS_SNIPPET} />
                </div>
            </DocCard>

            {/* Tools */}
            <SectionTitle
                id="tools"
                subtitle="The server registers two tools. Both are read-only — nothing signs, sends or mutates."
            >
                Tools
            </SectionTitle>
            <ToolsShowcase />

            {/* Examples */}
            <SectionTitle subtitle="Things worth asking once the server is connected.">Examples</SectionTitle>
            <ExamplesCarousel />
        </div>
    );
}

const TOOL_NAMES = ['inspect_entity', 'ping'] as const;

/** Tool reference behind the same underline-tab navigation as the Setup card. */
function ToolsShowcase() {
    const [tool, setTool] = useState<string>(TOOL_NAMES[0]);

    return (
        <DocCard className="mb-12 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            <Tabs value={tool} onValueChange={setTool}>
                <TabsList
                    style={{ display: 'flex' }}
                    className="-mx-4 mb-4 flex-nowrap gap-x-5 overflow-x-auto border-b border-white/10 px-4 sm:-mx-6 sm:px-6"
                >
                    {TOOL_NAMES.map(name => (
                        <TabsTrigger key={name} value={name} className="shrink-0 whitespace-nowrap font-mono">
                            {name}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value="inspect_entity">
                    <InspectEntityDoc />
                </TabsContent>
                <TabsContent value="ping">
                    <PingDoc />
                </TabsContent>
            </Tabs>
        </DocCard>
    );
}

function InspectEntityDoc() {
    return (
        <div>
            <p className="m-0 text-base leading-relaxed text-neutral-300">
                Retrieves detailed on-chain data for any Solana address or transaction signature. The tool detects which
                one it was given.
            </p>

            <ToolDocDivider />
            <ToolDocSection title="What it covers" defaultOpen={false}>
                <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-sm leading-relaxed text-neutral-300">
                    {INSPECT_ENTITY_COVERS.map(item => (
                        <li key={item} className="flex gap-2">
                            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-neutral-600" aria-hidden />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </ToolDocSection>

            <ToolDocDivider />
            <ToolDocSection title="Request parameters">
                <div className="mt-3 flex flex-col gap-3">
                    <ToolParam name="identifier" required>
                        A base58 string, 1–128 characters: a 32-byte account address or a 64-byte transaction signature.
                    </ToolParam>
                    <ToolParam name="cluster">
                        One of <InlineCode>mainnet-beta</InlineCode>, <InlineCode>devnet</InlineCode>,{' '}
                        <InlineCode>testnet</InlineCode>, <InlineCode>simd296</InlineCode>. Defaults to{' '}
                        <InlineCode>mainnet-beta</InlineCode>.
                    </ToolParam>
                </div>
            </ToolDocSection>

            <ToolDocDivider />
            <ToolDocSection title="Response">
                <div className="mt-3">
                    <CodeBlock code={INSPECT_ENTITY_RESPONSE} />
                    <p className="mb-0 mt-4 text-sm leading-relaxed text-neutral-300">
                        Accounts owned by the legacy loaders are not supported yet and answer with a{' '}
                        <InlineCode>CURRENTLY_UNSUPPORTED</InlineCode> error. Fields that cannot be resolved come back
                        as explicit unknown markers rather than being dropped.
                    </p>
                </div>
            </ToolDocSection>
        </div>
    );
}

/** Collapsible tool-doc section: heading with the +/- right after it, framed by the dividers. */
function ToolDocSection({
    children,
    defaultOpen = true,
    title,
}: {
    children: React.ReactNode;
    defaultOpen?: boolean;
    title: string;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
                className="group flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
            >
                <h4 className="m-0 text-sm font-medium text-white">{title}</h4>
                <span className="text-neutral-500 transition-colors group-hover:text-dark-accent">
                    {open ? <Minus size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
                </span>
            </button>
            {open && children}
        </div>
    );
}

/** Full-bleed rule between the tool-doc sections (compensates the card padding). */
function ToolDocDivider() {
    return <div className="-mx-4 my-4 border-0 border-t border-solid border-white/10 sm:-mx-6" />;
}

function PingDoc() {
    return (
        <p className="m-0 text-base leading-relaxed text-neutral-300">
            Basic health tool. Takes no arguments and answers <InlineCode>pong</InlineCode>. Ask the agent to call it to
            verify the connection end-to-end.
        </p>
    );
}

function ToolParam({ name, required, children }: { name: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-baseline gap-2">
                <InlineCode>{name}</InlineCode>
                <span className="text-xs text-neutral-500">{required ? 'required' : 'optional'}</span>
            </div>
            <p className="mb-0 mt-1.5 text-sm leading-relaxed text-neutral-300">{children}</p>
        </div>
    );
}

function StatusValue({ status }: { status: EndpointStatus }) {
    if (status.state === 'checking') {
        return <span className="text-neutral-500">Checking…</span>;
    }
    if (status.state === 'disabled') {
        return (
            <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-neutral-500" aria-hidden />
                Disabled
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-dark-accent" aria-hidden />
            Ready{status.ms !== undefined && <span className="text-neutral-500">· {status.ms} ms</span>}
        </span>
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
            transparent
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
                                <div className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-solid border-white/10 bg-white/10 px-4 py-2.5 text-sm leading-relaxed text-white">
                                    {example.question}
                                </div>
                                <div className="flex items-center gap-1.5 self-start px-1 text-xs text-neutral-500">
                                    <Tool size={12} aria-hidden />
                                    <span>
                                        Ran <span className="font-mono text-neutral-400">{example.tool}</span> ·
                                        Explorer MCP
                                    </span>
                                </div>
                                <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-solid border-white/10 bg-white/5 px-4 py-2.5 text-sm leading-relaxed text-neutral-300">
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
