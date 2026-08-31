'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Minus, Plus, Tool } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { cn } from '@/app/components/shared/utils';

import { AGENT_INSTRUCTIONS_SNIPPET, AGENT_INSTRUCTIONS_TARGETS, SETUP_CLIENTS } from '../lib/setup-clients';
import { useDeploymentOrigin } from '../lib/useDeploymentOrigin';
import { CodeBlock } from './CodeBlock';
import { DocCard } from './DocCard';
import { InlineCode } from './InlineCode';

// Mobile-only sticky tab strip. While scrolling a section its tab strip pins to the top of the window; once
// less than `tailPx` is left below the strip to the section's end, it detaches and scrolls away — kept
// `position: sticky` but with `top` driven negative, so it re-pins on the way back up and its
// box/width/horizontal-scroll are preserved. Desktop (>= sm) leaves the strip static.
function useStickyRelease(tailPx = 320) {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const stripRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 575.98px)');
        let raf = 0;
        const update = () => {
            raf = 0;
            const section = sectionRef.current;
            const strip = stripRef.current;
            if (!section || !strip) return;
            if (!mq.matches) {
                strip.style.top = '';
                return;
            }
            const rect = section.getBoundingClientRect();
            const threshold = tailPx + strip.offsetHeight;
            strip.style.top = rect.bottom < threshold ? `${Math.round(rect.bottom - threshold)}px` : '0px';
        };
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        mq.addEventListener('change', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            mq.removeEventListener('change', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [tailPx]);

    return { sectionRef, stripRef };
}

// On tab switch, pull the section's top up to the top of the window — but only if it has scrolled above the
// viewport (you're inside/past the section). If the section top is still at or below the viewport top (you're
// above it), leave the scroll alone. Uses `window.scrollTo` (not `scrollIntoView`, which wouldn't move the
// page here) and defers a frame so it lands after the tab click's own focus-into-view scroll.
function scrollSectionToTop(el: HTMLElement | null) {
    if (!el) return;
    requestAnimationFrame(() => {
        const rectTop = el.getBoundingClientRect().top;
        if (rectTop >= 0) return;
        window.scrollTo({ behavior: 'instant', top: window.scrollY + rectTop });
    });
}

/** Table inside an example answer, mirroring the tables the agent printed. */
function AnswerTable({ head, rows }: { head: string[]; rows: string[][] }) {
    return (
        // The rounded outer border lives on the wrapper (kept intact by the scroll container's clipping); cells
        // draw only the inner grid lines, so no border is lost at the corners.
        <div className="overflow-x-auto rounded-lg border border-solid border-white/10">
            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr>
                        {head.map(title => (
                            <th
                                key={title}
                                className="border-0 border-b border-r border-solid border-white/10 px-2.5 py-1.5 text-left font-medium text-neutral-400 last:border-r-0"
                            >
                                {title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row[0]}>
                            {row.map(cell => (
                                <td
                                    key={cell}
                                    className="border-0 border-r border-t border-solid border-white/10 px-2.5 py-1.5 align-top text-neutral-300 [overflow-wrap:anywhere] last:border-r-0"
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Bold intra-answer heading, standing in for the terminal's highlighted lines. */
function AnswerHeading({ children }: { children: React.ReactNode }) {
    return <p className="m-0 font-medium text-white">{children}</p>;
}

// Real conversations with a coding agent connected to this MCP server, shortened
// without losing the facts; the long tails sit in `more` behind "Expand message".
const EXAMPLES: { answer: React.ReactNode; label: string; more?: React.ReactNode; question: string; tool: string }[] = [
    {
        answer: (
            <>
                <p className="m-0">{'USDC (EPjFWdd5...) — SPL Token mint on mainnet-beta:'}</p>
                <AnswerTable
                    head={['Field', 'Value']}
                    rows={[
                        ['Mint authority', 'BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG'],
                        ['Supply', '7748676460441051 raw → 7,748,676,460.441051 USDC'],
                        ['Decimals', '6'],
                    ]}
                />
                <p className="m-0">
                    {
                        'Supply is variable (mint authority present); freeze authority is 7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar.'
                    }
                </p>
            </>
        ),
        label: 'Token mint',
        question: 'What are the mint authority, supply and decimals of EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?',
        tool: 'inspect_entity',
    },
    {
        answer: (
            <>
                <p className="m-0">
                    {'Squads Multisig Program (SQDS4ep65T...) — BPF upgradeable-loader program on mainnet-beta.'}
                </p>
                <p className="m-0">
                    {
                        'Upgradeable: no — upgrade_authority: null, the authority was revoked, so the program is frozen. Last deployed at slot 302582236; executable data lives at Fy3YMJCvwbAXUgUM5b91ucUVA3jYzwWLHL3MwBqKsh8n.'
                    }
                </p>
                <p className="m-0">
                    {
                        'IDL: yes — published on-chain via Anchor, served as Codama, program name "Squads Multisig Program".'
                    }
                </p>
                <p className="m-0">
                    {
                        'Extras: a verified build against Squads-Protocol/v4 @ 2a47b4c (signer sqdcVVoTcKZjXU8yPUwKFbGx1Hig1rhbWJQtMRXp2E1) and an embedded security.txt — audited by OtterSec and Neodyme, contact security@sqds.io.'
                    }
                </p>
            </>
        ),
        label: 'Program inspection',
        question: 'Inspect SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf — is it upgradeable and does it publish an IDL?',
        tool: 'inspect_entity',
    },
    {
        answer: (
            <>
                <p className="m-0">
                    {
                        'A v0 message, success, finalized at slot 439023338. One signer: EVybKZ6kp8CccQSkcAdfsstG5aX8mbQQC6jrKTcuFhVp. Fee 5000 lamports, CU consumed 67888; 53 accounts total, 34 pulled in from 5 address lookup tables.'
                    }
                </p>
                <p className="m-0">
                    {
                        'There are no inner instructions — anywhere: three invoke [1] lines in the logs and no [2] depth at all. That is the most interesting fact in this transaction.'
                    }
                </p>
            </>
        ),
        label: 'Transaction walkthrough',
        more: (
            <>
                <AnswerHeading>Instruction 1 — ComputeBudget</AnswerHeading>
                <p className="m-0">
                    {
                        'SetComputeUnitLimit, value 600,000. No SetComputeUnitPrice anywhere, so no priority fee — the 5000 lamport fee is base fee only.'
                    }
                </p>
                <AnswerHeading>Instruction 2 — System transfer</AnswerHeading>
                <p className="m-0">
                    {
                        'system::transfer, 1002 lamports from EVybKZ6k… (the signer) → Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY. Trivially small, and not a Jito tip pattern.'
                    }
                </p>
                <AnswerHeading>
                    Instruction 3 — unknown program 8GCr9711iFUmGdW4vPGoBYHoLEACKHKY8aycYNuxViXk
                </AnswerHeading>
                <p className="m-0">
                    {
                        'The whole payload of the transaction: 53 account references, 154 bytes of data, 67,588 CU consumed. Not decodable — the program is unverified and publishes no IDL (authority 2zYaeycd8jK1RjH9ZXLTHJp13xjmdC5FhPpSWtZrsXwp, deployed at slot 436916586), so the instruction stays raw.'
                    }
                </p>
                <p className="m-0">
                    {
                        'The account list still talks: LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo (Meteora DLMM), pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA (PumpSwap AMM) plus pfeeUxB6… (PumpSwap fee config), full token infra, and pool/vault-looking accounts from the lookup tables — a multi-venue swap router shape.'
                    }
                </p>
                <AnswerHeading>The thing worth flagging</AnswerHeading>
                <p className="m-0">
                    {
                        'A 53-account instruction touching two AMM programs issued zero CPIs — it burned 67.5k CU reading accounts and returned success without invoking Token, Meteora, or PumpSwap even once. The consistent read (inference, not proof) is an arbitrage/MEV bot: load candidate pools, compute profitability on-chain, exit cleanly when the opportunity is not there. For certainty you would need the program source or a dump of its executable data (FkFnystz3DzSqDr3o64nLsUkecA9dvd9nNTrHZZBCtwQ).'
                    }
                </p>
                <p className="m-0">
                    {
                        'The 154-byte payload has no recognizable Anchor discriminator; two constants stand out — e8764817 = 390,000,000 (0.39 SOL if lamports) and a trailing f64 1.0, which reads like a threshold/slippage parameter.'
                    }
                </p>
            </>
        ),
        question:
            'Walk me through this transaction signature 3MVAxtaFp76y23DBd3MdXTEjpzH8zFtVB1HtVdYSKqZPpx1R9gEkDXCF9bX26vkAvyerz2K54eMCFF7cPpkzArM1 instruction by instruction, including inner instructions.',
        tool: 'inspect_entity',
    },
    {
        answer: (
            <>
                <p className="m-0">
                    {
                        '"Sent from my Pumpfun App" (App) — Token-2022 mint, 6 decimals, supply 912,905,455.031061 App, fixed.'
                    }
                </p>
                <p className="m-0">{'Only two extensions, and nobody can change any of them:'}</p>
                <AnswerTable
                    head={['Extension', 'Current state', 'Who can change it']}
                    rows={[
                        ['metadataPointer', 'points at the mint itself', 'authority: null — nobody'],
                        [
                            'tokenMetadata',
                            'name "Sent from my Pumpfun App", symbol "App", uri, no additional fields',
                            'updateAuthority: null — nobody',
                        ],
                    ]}
                />
            </>
        ),
        label: 'Token-2022 extensions',
        more: (
            <>
                <p className="m-0">
                    {
                        'Mint and freeze authorities are also null (supply_type: fixed), and the extensions that carry real issuer power are simply absent: no permanentDelegate, no transferHook, no transferFeeConfig, no confidential-transfer config. There is no key anywhere with authority over this mint.'
                    }
                </p>
                <p className="m-0">
                    {
                        'Two caveats before reading that as "safe": the on-chain metadata pointer is frozen, but it points at https://md.sdfgsdfsdf.uk/metadata/XGrhDXnd — whoever controls that domain can change the name, image and description at any time; and mint-level renunciation says nothing about liquidity or holder concentration — no authority to rug the mint ≠ no way to rug.'
                    }
                </p>
                <p className="m-0">
                    {
                        'Incidentally, this mint appeared in the transaction above — one of the read-only accounts pulled in from lookup table BMAAGcWbUNNVE15DpETYXBW7L1Ba4jqq1JywECkzNLSW in instruction 3, consistent with scanning pools for this token and finding nothing worth executing.'
                    }
                </p>
            </>
        ),
        question:
            'Which Token-2022 extensions are enabled on this mint 49nkLrXi8nCZBVKsShDNasEtPe4Vn1mx9Xbr3kTa8pTL, and who can still change them?',
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

export function McpDocsOverviewView() {
    const origin = useDeploymentOrigin();
    const [client, setClient] = useState(SETUP_CLIENTS[0].id);
    const [status, setStatus] = useState<EndpointStatus>({ state: 'checking' });
    const setupSticky = useStickyRelease();

    // Live health probe: a bare GET to /mcp answers 4xx when the endpoint is up (it wants a POST with
    // MCP headers) — that still means "reachable". Only a 5xx counts as not serving: 503 is the explicit
    // "MCP disabled" sentinel (route.ts), and other 5xx / a network error mean it can't be reached.
    useEffect(() => {
        const started = performance.now();
        fetch('/mcp')
            .then(response =>
                setStatus({
                    ms: Math.round(performance.now() - started),
                    state: response.status >= 500 ? 'disabled' : 'ready',
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
                {/* `!px-4` tightens the `lg` size's `px-8` (important beats it — cn has no tailwind-merge). */}
                <Button asChild variant="accent" size="lg" className="!px-4">
                    <a href="#setup" className="no-underline">
                        Set up your agent
                    </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="!px-4">
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
                        <a
                            href={`${origin}/mcp`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-dark-accent no-underline [overflow-wrap:anywhere]"
                        >
                            {`${origin}/mcp`}
                            <ExternalLink
                                size={12}
                                aria-hidden
                                className="relative -top-0.5 ml-1 inline align-text-bottom"
                            />
                        </a>
                    </HeroFact>
                    <HeroFact label="Transport">
                        <span className="text-sm">Streamable HTTP, stateless</span>
                    </HeroFact>
                    <HeroFact label="Auth">
                        <span className="text-sm">Open — no key required</span>
                    </HeroFact>
                    <HeroFact label="Clusters">
                        <span className="text-sm">mainnet-beta · devnet · testnet · simd296</span>
                    </HeroFact>
                    <HeroFact label="Tools">
                        <span className="text-sm">inspect_entity · ping</span>
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
            <DocCard ref={setupSticky.sectionRef} className="mb-12 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
                <Tabs
                    value={client}
                    onValueChange={value => {
                        setClient(value);
                        // Switching tabs resets scroll to the top of the (possibly shorter/taller) new panel.
                        scrollSectionToTop(setupSticky.sectionRef.current);
                    }}
                >
                    <TabsList
                        ref={setupSticky.stripRef}
                        // `!flex` overrides TabsList's base `inline-flex` (important beats it — cn has no tailwind-merge).
                        className="sticky top-0 z-10 -mx-4 mb-4 !flex flex-nowrap gap-x-5 overflow-x-auto rounded-t-[11px] border-b border-white/10 bg-heavy-metal-800 px-4 [scrollbar-width:none] sm:static sm:-mx-6 sm:rounded-none sm:bg-transparent sm:px-6 [&::-webkit-scrollbar]:hidden"
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

// Tab labels: plain words, capitalised. The tab `value` stays the raw tool name (it keys the panels).
const TOOL_LABELS: Record<(typeof TOOL_NAMES)[number], string> = {
    inspect_entity: 'Inspect entity',
    ping: 'Ping',
};

/** Tool reference behind the same underline-tab navigation as the Setup card. */
function ToolsShowcase() {
    const [tool, setTool] = useState<string>(TOOL_NAMES[0]);
    const sticky = useStickyRelease();

    return (
        <DocCard ref={sticky.sectionRef} className="mb-12 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            <Tabs
                value={tool}
                onValueChange={value => {
                    setTool(value);
                    // Switching tabs resets scroll to the top of the new panel.
                    scrollSectionToTop(sticky.sectionRef.current);
                }}
            >
                <TabsList
                    ref={sticky.stripRef}
                    // `!flex` overrides TabsList's base `inline-flex` (important beats it — cn has no tailwind-merge).
                    className="sticky top-0 z-10 -mx-4 mb-4 !flex flex-nowrap gap-x-5 overflow-x-auto rounded-t-[11px] border-b border-white/10 bg-heavy-metal-800 px-4 [scrollbar-width:none] sm:static sm:-mx-6 sm:rounded-none sm:bg-transparent sm:px-6 [&::-webkit-scrollbar]:hidden"
                >
                    {TOOL_NAMES.map(name => (
                        <TabsTrigger key={name} value={name} className="shrink-0 whitespace-nowrap">
                            {TOOL_LABELS[name]}
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
                <a
                    href="https://github.com/solana-foundation/explorer/blob/master/app/mcp/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-dark-accent no-underline"
                >
                    How to run
                    <ExternalLink size={12} aria-hidden />
                </a>
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
 * the selected conversation on the right. Auto-advances; hovering the card
 * pauses the rotation, and any tap/click (a chat or "Expand message") parks it
 * until the section scrolls out of view — important on touch devices with no
 * hover. Long conversations start collapsed behind "Expand message" and
 * collapse again on every conversation change.
 */
function ExamplesCarousel() {
    const [index, setIndex] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [engaged, setEngaged] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const sticky = useStickyRelease();

    useEffect(() => {
        if (hovered || engaged) {
            return;
        }
        const timer = setInterval(() => setIndex(current => (current + 1) % EXAMPLES.length), EXAMPLE_ROTATION_MS);
        return () => clearInterval(timer);
        // `index` restarts the timer after an auto-advance so every conversation gets a full period.
    }, [hovered, engaged, index]);

    // Every newly shown conversation starts collapsed — including returning to one expanded before.
    useEffect(() => setExpanded(false), [index]);

    // A tap/click parks the rotation; leaving the viewport re-arms it.
    useEffect(() => {
        if (!engaged || rootRef.current === null) {
            return;
        }
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) {
                setEngaged(false);
            }
        });
        observer.observe(rootRef.current);
        return () => observer.disconnect();
    }, [engaged]);

    return (
        <DocCard
            ref={sticky.sectionRef}
            transparent
            className="mb-12"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div ref={rootRef} className="flex flex-col sm:flex-row">
                {/* Chat list — mobile: a sticky, horizontal, scrollable underline tab strip (like Setup/Tools);
                    desktop: a static vertical sidebar with a left-bar active marker. */}
                <div
                    ref={sticky.stripRef}
                    role="tablist"
                    aria-label="Examples"
                    className={cn(
                        'sticky top-0 z-10 flex shrink-0 flex-row gap-x-5 overflow-x-auto rounded-t-[11px] border-0 border-b border-solid border-white/10 bg-dark-background px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                        'sm:static sm:z-auto sm:w-52 sm:flex-col sm:gap-x-0 sm:overflow-visible sm:rounded-none sm:border-b-0 sm:border-r sm:bg-transparent sm:px-0 sm:py-3',
                    )}
                >
                    {EXAMPLES.map((example, exampleIndex) => {
                        const active = exampleIndex === index;
                        return (
                            <button
                                key={example.label}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => {
                                    setIndex(exampleIndex);
                                    // Re-selecting the current chat won't change `index` — collapse explicitly.
                                    setExpanded(false);
                                    setEngaged(true);
                                    // Switching chats resets scroll to the top of the new conversation.
                                    scrollSectionToTop(sticky.sectionRef.current);
                                }}
                                className={cn(
                                    'cursor-pointer whitespace-nowrap border-0 bg-transparent px-0 py-4 text-left text-sm transition-colors sm:px-4 sm:py-3',
                                    // Active marker: underline on mobile, left bar on the desktop sidebar.
                                    'border-b-2 border-solid sm:border-b-0 sm:border-l-2',
                                    active
                                        ? 'border-dark-accent text-white sm:bg-heavy-metal-900'
                                        : 'border-transparent text-neutral-400 hover:text-neutral-200 sm:hover:bg-heavy-metal-900',
                                )}
                            >
                                {example.label}
                            </button>
                        );
                    })}
                </div>

                {/* Conversation view: the active conversation defines the height (no inner scroll);
                    inactive ones sit absolutely on top of it, kept mounted for the cross-fade. */}
                <div className="relative min-w-0 grow">
                    {EXAMPLES.map((example, exampleIndex) => {
                        const active = exampleIndex === index;
                        return (
                            <div
                                key={example.label}
                                aria-hidden={!active}
                                className={cn(
                                    'flex flex-col gap-2 p-4 transition-opacity duration-500 sm:p-6',
                                    active
                                        ? 'opacity-100'
                                        : 'pointer-events-none absolute inset-0 overflow-hidden opacity-0',
                                )}
                            >
                                <div className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-solid border-white/10 bg-white/10 px-4 py-2.5 text-sm leading-relaxed text-white [overflow-wrap:anywhere]">
                                    {example.question}
                                </div>
                                <div className="flex items-center gap-1.5 self-start px-1 text-xs text-neutral-500">
                                    <Tool size={12} aria-hidden />
                                    <span>
                                        Ran <span className="font-mono text-neutral-400">{example.tool}</span> ·
                                        Explorer MCP
                                    </span>
                                </div>
                                <div className="flex max-w-[85%] flex-col gap-3 self-start rounded-2xl rounded-bl-md border border-solid border-white/10 bg-white/5 px-4 py-2.5 text-sm leading-relaxed text-neutral-300 [overflow-wrap:anywhere]">
                                    {example.answer}
                                    {expanded && example.more}
                                    {example.more !== undefined && !expanded && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setExpanded(true);
                                                setEngaged(true);
                                            }}
                                            // Match the link hover: `<a>` darkens via the global `a:hover`;
                                            // a `<button>` isn't covered by it, so set the same token explicitly.
                                            className="cursor-pointer self-start border-0 bg-transparent p-0 text-xs font-medium text-dark-accent hover:text-dark-accent-hover"
                                        >
                                            Expand message
                                        </button>
                                    )}
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
            <span className="text-sm uppercase tracking-wide text-neutral-500">{label}</span>
            <span className="text-sm text-neutral-200">{children}</span>
        </div>
    );
}
