'use client';

import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React, { ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'react-feather';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/shared/ui/table';
import { cn } from '@/app/components/shared/utils';

import { ADVANCED_CHUNKS } from '../lib/advanced-chunks';
import { useDeploymentOrigin } from '../lib/useDeploymentOrigin';
import { CodeBlock } from './CodeBlock';
import { DocCard } from './DocCard';
import { DocSection, InlineCode } from './DocSection';

export function McpDocsAdvancedView() {
    const origin = useDeploymentOrigin();
    const overviewPath = useClusterPath({ pathname: '/mcp/docs' });
    const [active, setActive] = useState(ADVANCED_CHUNKS[0].anchor);

    // Deep links from the overview catalog arrive as #anchor — honor them and keep the hash shareable.
    useEffect(() => {
        const applyHash = () => {
            const anchor = window.location.hash.slice(1);
            if (ADVANCED_CHUNKS.some(chunk => chunk.anchor === anchor)) {
                setActive(anchor);
            }
        };
        applyHash();
        window.addEventListener('hashchange', applyHash);
        return () => window.removeEventListener('hashchange', applyHash);
    }, []);

    const select = (anchor: string) => {
        setActive(anchor);
        // eslint-disable-next-line unicorn/no-null -- History API expects null state
        window.history.replaceState(null, '', `#${anchor}`);
        window.scrollTo({ behavior: 'smooth', top: 0 });
    };

    const activeIndex = ADVANCED_CHUNKS.findIndex(chunk => chunk.anchor === active);
    // The last section wraps around to the first topic.
    const nextChunk = ADVANCED_CHUNKS[(activeIndex + 1) % ADVANCED_CHUNKS.length];

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
            <div className="flex flex-col gap-8 sm:flex-row">
                <nav
                    aria-label="Sections"
                    className="shrink-0 self-start rounded-xl border border-solid border-white/10 p-2 sm:sticky sm:top-6"
                >
                    <Link
                        // The advanced reference belongs to the v1 prototype — return to the v1 overview.
                        href={`${overviewPath}#v1`}
                        className="flex items-center gap-2 rounded px-3 py-2 text-sm text-neutral-400 no-underline hover:bg-heavy-metal-900 hover:text-white"
                    >
                        <ArrowLeft size={14} aria-hidden />
                        MCP Overview
                    </Link>
                    <div className="-mx-2 my-2 border-0 border-t border-solid border-white/10" />
                    <div className="flex flex-col gap-0.5">
                        {ADVANCED_CHUNKS.map(chunk => {
                            const isActive = chunk.anchor === active;
                            return (
                                <button
                                    key={chunk.anchor}
                                    type="button"
                                    onClick={() => select(chunk.anchor)}
                                    className={cn(
                                        'cursor-pointer rounded border-0 px-3 py-2 text-left text-sm transition-colors sm:whitespace-nowrap',
                                        isActive
                                            ? 'bg-heavy-metal-900 text-white'
                                            : 'bg-transparent text-neutral-400 hover:bg-heavy-metal-900 hover:text-neutral-200',
                                    )}
                                >
                                    {chunk.title}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="flex min-w-0 grow flex-col gap-12">
                    <DocSection
                        kicker="Advanced configuration & reference"
                        hidden={active !== 'access-control'}
                        anchor="access-control"
                        title="Enabling & access control"
                    >
                        <p className="m-0">
                            The <InlineCode>/mcp</InlineCode> endpoint is inert by default — every request gets{' '}
                            <InlineCode>503</InlineCode> until the deployment explicitly enables it. All configuration
                            is environment-only (see <InlineCode>.env.example</InlineCode>); keys and the blocklist are
                            parsed once at module scope, so changes require a redeploy.
                        </p>
                        <DocTable
                            head={['Variable', 'Purpose', 'Why it exists']}
                            rows={[
                                [
                                    <InlineCode key="v">MCP_ENDPOINT_ENABLED</InlineCode>,
                                    <>
                                        <InlineCode>true</InlineCode> enables the endpoint; anything else keeps it
                                        returning <InlineCode>503</InlineCode>.
                                    </>,
                                    'Opt-in by design: an Explorer deployment should not silently expose an agent-facing API (and its RPC spend) just because the code ships with it.',
                                ],
                                [
                                    <InlineCode key="v">MCP_ACCESS_KEYS</InlineCode>,
                                    <>
                                        Comma-separated bearer keys; requests need{' '}
                                        <InlineCode>Authorization: Bearer &lt;key&gt;</InlineCode>.
                                    </>,
                                    'Gates who can consume your RPC quota. Comparison is constant-time. Unset = deliberate open access, logged as a warning at startup. Multiple keys let you hand one per consumer and revoke individually.',
                                ],
                                [
                                    <InlineCode key="v">MCP_BLOCKED_IPS</InlineCode>,
                                    <>
                                        Comma-separated client IPs rejected with <InlineCode>403</InlineCode>.
                                    </>,
                                    'Emergency brake against an abusive client without rotating keys for everyone — useful precisely when running open access.',
                                ],
                            ]}
                        />
                        <p className="m-0">
                            On Vercel: add the variables in Project Settings → Environment Variables, then redeploy.
                        </p>
                        <SubTitle>Route behavior worth knowing</SubTitle>
                        <NumberedList
                            items={[
                                <>
                                    <Strong>Stateless by construction</Strong> — a fresh MCP server per request, so the
                                    endpoint is serverless-safe: no session affinity, no state to lose between
                                    invocations.
                                </>,
                                <>
                                    <Strong>
                                        <InlineCode>/mcp</InlineCode>, not <InlineCode>/api/mcp</InlineCode>
                                    </Strong>{' '}
                                    — placed outside <InlineCode>/api/*</InlineCode> to escape the BotID proxy matcher,
                                    which would otherwise challenge non-browser MCP clients.
                                </>,
                                <>
                                    <Strong>Full CORS</Strong> (<InlineCode>GET</InlineCode>/
                                    <InlineCode>POST</InlineCode>/<InlineCode>DELETE</InlineCode>/
                                    <InlineCode>OPTIONS</InlineCode>; MCP session and protocol headers exposed) —
                                    browser-based agents work, and even error responses stay CORS-consistent so clients
                                    see the real status instead of an opaque network failure.
                                </>,
                                <>
                                    <Strong>
                                        <InlineCode>maxDuration = 60</InlineCode>
                                    </Strong>{' '}
                                    applies to this route only — deep inspections (lookup-table resolution + IDL decode)
                                    need more than the default function budget, without raising it app-wide.
                                </>,
                                <>
                                    <Strong>Lazy loading</Strong> — the MCP package is imported on first request, so a
                                    disabled endpoint adds nothing to the serverless bundle; a failed import is not
                                    cached, so a transient error does not stick until redeploy.
                                </>,
                                <>
                                    <Strong>
                                        <InlineCode>server-only</InlineCode> lock
                                    </Strong>{' '}
                                    — the config module reads key-bearing RPC URLs and fails the build if ever pulled
                                    into a client bundle. URLs resolve at cold start from runtime env, never into a
                                    build artifact.
                                </>,
                            ]}
                        />
                    </DocSection>

                    <DocSection
                        kicker="Advanced configuration & reference"
                        hidden={active !== 'rpc-configuration'}
                        anchor="rpc-configuration"
                        title="RPC configuration"
                    >
                        <DocTable
                            head={['Variable', 'Purpose']}
                            rows={[
                                [
                                    <InlineCode key="v">
                                        MCP_SOLANA_RPC_URL_MAINNET_BETA / _DEVNET / _TESTNET / _SIMD296
                                    </InlineCode>,
                                    'Dedicated RPC endpoint per cluster for MCP traffic.',
                                ],
                            ]}
                        />
                        <p className="m-0">
                            <Strong>Why:</Strong> agents are chatty — a single <InlineCode>inspect_entity</InlineCode>{' '}
                            call on a transaction can fan out into lookup-table fetches, IDL discovery, and DAS calls.
                            Dedicated endpoints keep that traffic off the quota that serves the Explorer UI, and let you
                            rate-limit or bill agent usage separately.
                        </p>
                        <p className="m-0">
                            <Strong>Fallback:</Strong> unset variables fall back to the app&apos;s own server RPC config
                            (<InlineCode>*_RPC_URL</InlineCode> env → proxied default) — never to a raw public endpoint,
                            so the MCP path inherits whatever keys and proxying the app already uses.
                        </p>
                    </DocSection>

                    <DocSection
                        kicker="Advanced configuration & reference"
                        hidden={active !== 'preview-deployments'}
                        anchor="preview-deployments"
                        title="Preview deployments (Vercel)"
                    >
                        <p className="m-0">
                            Previews sit behind Deployment Protection, so clients must present the{' '}
                            <a
                                href="https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-dark-accent no-underline hover:underline"
                            >
                                Protection Bypass for Automation
                            </a>{' '}
                            secret in addition to the endpoint&apos;s own Bearer auth:
                        </p>
                        <NumberedList
                            items={[
                                <>
                                    Generate the secret in Project Settings → Deployment Protection → Protection Bypass
                                    for Automation.
                                </>,
                                <>
                                    Send it as the <InlineCode>x-vercel-protection-bypass</InlineCode> header, or{' '}
                                    <InlineCode>?x-vercel-protection-bypass=&lt;secret&gt;</InlineCode> for clients that
                                    cannot set headers.
                                </>,
                            ]}
                        />
                        <CodeBlock
                            code={JSON.stringify(
                                {
                                    mcpServers: {
                                        'solana-explorer': {
                                            headers: {
                                                Authorization: 'Bearer <key>',
                                                'x-vercel-protection-bypass': '<secret>',
                                            },
                                            type: 'http',
                                            url: '<preview-deployment>/mcp',
                                        },
                                    },
                                },
                                undefined,
                                4,
                            )}
                        />
                        <p className="m-0">
                            <Strong>Why two layers:</Strong> the bypass gets you through Vercel&apos;s platform gate
                            (which knows nothing about MCP); the Bearer key is the endpoint&apos;s own auth. Omit the
                            bypass header outside previews.
                        </p>
                    </DocSection>

                    <DocSection
                        kicker="Advanced configuration & reference"
                        hidden={active !== 'inspect-entity'}
                        anchor="inspect-entity"
                        title="inspect_entity reference"
                    >
                        <p className="m-0">Read-only and idempotent (annotated as such, so agents may retry freely).</p>
                        <SubTitle>Input</SubTitle>
                        <DocTable
                            head={['Field', 'Type', 'Notes']}
                            rows={[
                                [
                                    <InlineCode key="f">identifier</InlineCode>,
                                    'string (1–128 chars, base58)',
                                    'Account address (32-byte) or transaction signature (64-byte) — the tool detects which type was provided.',
                                ],
                                [
                                    <InlineCode key="f">cluster</InlineCode>,
                                    'mainnet-beta | devnet | testnet | simd296',
                                    'Optional; defaults to mainnet-beta.',
                                ],
                            ]}
                        />
                        <SubTitle>
                            Account kinds (<InlineCode>entity.kind</InlineCode>)
                        </SubTitle>
                        <DocTable
                            head={['Kind', 'Payload']}
                            rows={[
                                [
                                    <InlineCode key="k">spl-token[-2022]:mint</InlineCode>,
                                    'Address, supply, decimals, mint/freeze authorities, supply type (fixed/variable), token program. Token-2022 mints also include parsed extensions.',
                                ],
                                [
                                    <InlineCode key="k">spl-token[-2022]:account</InlineCode>,
                                    'Mint, owner, token program.',
                                ],
                                [
                                    <InlineCode key="k">spl-token[-2022]:multisig</InlineCode>,
                                    'Signers, threshold, initialization status.',
                                ],
                                [
                                    <InlineCode key="k">compressed-nft</InlineCode>,
                                    'Asset ID, owner, merkle tree (classified via DAS).',
                                ],
                                [
                                    <span key="k" className="font-mono text-xs">
                                        stake, vote, nonce, sysvar, config, address-lookup-table, feature, nftoken,
                                        solana-attestation-service
                                    </span>,
                                    'Recognized system account types.',
                                ],
                                [<InlineCode key="k">native-program</InlineCode>, 'Built-in native programs.'],
                                [
                                    <InlineCode key="k">bpf-upgradeable-loader</InlineCode>,
                                    'Upgradeable programs — address, label, balance, executable-data account, upgradeability, last deploy slot, upgrade authority, plus an idl enrichment (status, idl_type, source, program name).',
                                ],
                                [
                                    <InlineCode key="k">bpf-loader / bpf-loader-2 / loader-v4</InlineCode>,
                                    'Legacy-loader programs — currently unsupported; return a CURRENTLY_UNSUPPORTED error.',
                                ],
                                [
                                    <InlineCode key="k">unknown</InlineCode>,
                                    'Unrecognized account type. When the owner program publishes an IDL, the account data is decoded through it and returned as decoded (source "idl").',
                                ],
                                [<InlineCode key="k">transaction</InlineCode>, 'See below.'],
                            ]}
                        />
                        <SubTitle>Transactions</SubTitle>
                        <p className="m-0">
                            64-byte signatures return <InlineCode>entity.kind: &quot;transaction&quot;</InlineCode> —
                            slot, block time, fee, status, error, signers, accounts (v0 lookup-table addresses
                            attributed via <InlineCode>source</InlineCode>/<InlineCode>lookupTableAddress</InlineCode>),
                            and instructions with inner instructions. Instructions decode through a cascade — each step
                            exists because the previous one cannot cover everything:
                        </p>
                        <NumberedList
                            items={[
                                <>
                                    <Strong>
                                        <InlineCode>idl</InlineCode>
                                    </Strong>{' '}
                                    — programs publishing an on-chain IDL are decoded through it: always current, no
                                    Explorer release needed when the program upgrades.
                                </>,
                                <>
                                    <Strong>
                                        <InlineCode>bundled</InlineCode>
                                    </Strong>{' '}
                                    — token batch and host-app-supported programs decode through the Explorer&apos;s own
                                    instruction-parser dispatcher: covers major programs that publish no IDL.
                                </>,
                                <>
                                    <Strong>
                                        <InlineCode>raw</InlineCode>
                                    </Strong>{' '}
                                    — everything else stays base58, clearly labeled, so the agent knows the data is
                                    undecoded rather than empty.
                                </>,
                            ]}
                        />
                        <p className="m-0">
                            <Strong>Program labels:</Strong> program addresses resolve to human-readable names through
                            the Explorer&apos;s program registry, with a built-in fallback label map when the host
                            registry misses — so agents see &quot;Jupiter Aggregator v6&quot; rather than a bare
                            address.
                        </p>
                    </DocSection>

                    <DocSection
                        kicker="Advanced configuration & reference"
                        hidden={active !== 'output-format'}
                        anchor="output-format"
                        title="Output envelope & errors"
                    >
                        <p className="m-0">
                            Every tool reply carries the same envelope, both as <InlineCode>text</InlineCode> and{' '}
                            <InlineCode>structuredContent</InlineCode> (identical, JSON-round-tripped values — clients
                            can consume either):
                        </p>
                        <CodeBlock
                            code={`{\n    "payload": { "entity": { "kind": "...", "...": "..." } },\n    "errors": []\n}`}
                        />
                        <NumberedList
                            items={[
                                <>
                                    <Strong>Explicit unknown markers</Strong> instead of omitted fields — an agent can
                                    distinguish &quot;not applicable&quot; from &quot;could not resolve&quot;, which
                                    prevents hallucinated fill-ins.
                                </>,
                                <>
                                    <Strong>BigInt coercion</Strong> — large numerics are coerced to Number when safe,
                                    String otherwise, so the payload is always plain JSON.
                                </>,
                                <>
                                    <Strong>
                                        Key order <InlineCode>{'{ payload, errors }'}</InlineCode> is part of the wire
                                        format
                                    </Strong>{' '}
                                    (kept in parity with the standalone explorer-mcp).
                                </>,
                            ]}
                        />
                        <SubTitle>Error codes</SubTitle>
                        <p className="m-0">
                            <InlineCode>errors[].code</InlineCode>; <InlineCode>isError: true</InlineCode> when the list
                            is non-empty:
                        </p>
                        <DocTable
                            head={['Code', 'Meaning', 'Why a dedicated code']}
                            rows={[
                                [
                                    <InlineCode key="c">INVALID_ARGUMENT</InlineCode>,
                                    'Malformed input; includes flattened field-level schema details.',
                                    'Lets the agent fix its call instead of retrying blindly.',
                                ],
                                [
                                    <InlineCode key="c">NOT_FOUND</InlineCode>,
                                    'The entity does not exist on the selected cluster.',
                                    'Distinguishes "wrong cluster / typo" from a server failure — the agent can try another cluster.',
                                ],
                                [
                                    <InlineCode key="c">CURRENTLY_UNSUPPORTED</InlineCode>,
                                    'Recognized but not-yet-supported entity (e.g. legacy loaders).',
                                    'Honest "we know what this is but cannot decode it yet" — no point retrying.',
                                ],
                                [
                                    <InlineCode key="c">INTERNAL_ERROR</InlineCode>,
                                    'Sanitized internal failure.',
                                    'Details are stripped so stack traces and RPC URLs never leak to clients; full context goes to Sentry instead.',
                                ],
                            ]}
                        />
                        <p className="m-0">
                            Some failures are non-fatal: e.g. a signature-status outage surfaces as an error entry
                            alongside a usable payload — partial data beats no data for an agent.
                        </p>
                    </DocSection>

                    <DocSection
                        kicker="Advanced configuration & reference"
                        hidden={active !== 'telemetry'}
                        anchor="telemetry"
                        title="Telemetry & observability"
                    >
                        <SubTitle>Usage analytics (GA4)</SubTitle>
                        <DocTable
                            head={['Variable', 'Purpose']}
                            rows={[
                                [
                                    <InlineCode key="v">MCP_GA_MEASUREMENT_ID / MCP_GA_API_SECRET</InlineCode>,
                                    'GA4 Measurement Protocol credentials for server-side MCP usage analytics.',
                                ],
                            ]}
                        />
                        <p className="m-0">
                            <Strong>What is sent:</Strong> <InlineCode>initialize</InlineCode> and every tool call emit{' '}
                            <InlineCode>mcp_</InlineCode>-prefixed events (tool name, outcome, duration). Delivery runs
                            after the response, so analytics never delays a reply.
                        </p>
                        <NumberedList
                            items={[
                                <>
                                    <Strong>Dedicated server id preferred</Strong> —{' '}
                                    <InlineCode>MCP_GA_MEASUREMENT_ID</InlineCode> falls back to{' '}
                                    <InlineCode>NEXT_PUBLIC_GOOGLE_ANALYTICS_ID</InlineCode> so single-id setups work,
                                    but server telemetry should not depend on a client-side variable.
                                </>,
                                <>
                                    <Strong>Privacy</Strong> — session ids are pseudonymized (hashed) before leaving the
                                    server; event params are constrained to scalars and GA4 length limits, so no payload
                                    data or identifiers leak into analytics.
                                </>,
                                <>
                                    <Strong>Best-effort by contract</Strong> — a throwing analytics sink can never break
                                    a tool reply; failures log at warn. Missing credentials disable analytics with a
                                    single cold-start warning, because a silently disabled pipeline is indistinguishable
                                    from a broken one.
                                </>,
                            ]}
                        />
                        <SubTitle>Sentry</SubTitle>
                        <p className="m-0">
                            The MCP server is wrapped with Sentry instrumentation: tool calls get spans and error
                            capture automatically, and route-level failures report to Sentry while the client receives a
                            controlled, CORS-consistent <InlineCode>500</InlineCode>. <Strong>Why:</Strong> the
                            framework default 500 omits CORS headers, which browsers surface as an opaque network error
                            instead of the real status.
                        </p>
                    </DocSection>

                    <DocSection
                        kicker="Advanced configuration & reference"
                        hidden={active !== 'smoke-test'}
                        anchor="smoke-test"
                        title="Smoke test"
                    >
                        <p className="m-0">
                            The <InlineCode>initialize</InlineCode> → <InlineCode>tools/call ping</InlineCode>{' '}
                            round-trip verifies transport, auth, and (on previews) the protection bypass in one shot.
                            Through any configured client, calling <InlineCode>ping</InlineCode> should return{' '}
                            <InlineCode>pong</InlineCode>:
                        </p>
                        <CodeBlock
                            code={`# via Claude Code\nclaude mcp list   # solana-explorer should be listed as connected\n\n# or ask the agent to call the tool\n> use the solana-explorer ping tool`}
                        />
                        <p className="m-0">
                            The same round-trip is pinned by the integration spec in the{' '}
                            <InlineCode>@explorer/entity-inspector</InlineCode> package, with curl equivalents
                            documented alongside it.
                        </p>
                    </DocSection>

                    <DocSection
                        kicker="Advanced configuration & reference"
                        hidden={active !== 'architecture'}
                        anchor="architecture"
                        title="Architecture"
                    >
                        <p className="m-0">
                            The implementation is split so the inspection logic is reusable outside the app:
                        </p>
                        <DocTable
                            head={['Layer', 'Location', 'Role']}
                            rows={[
                                [
                                    'HTTP route',
                                    <InlineCode key="l">app/mcp/</InlineCode>,
                                    'Auth, IP blocklist, CORS, lazy handler init, GA4/Sentry wiring, host-app instruction-parser fallback.',
                                ],
                                [
                                    'MCP server + tools',
                                    <InlineCode key="l">packages/entity-inspector/src/mcp/</InlineCode>,
                                    'The explorer-mcp server, inspect_entity/ping tools, input schemas, error envelope.',
                                ],
                                [
                                    'Inspection core',
                                    <InlineCode key="l">packages/entity-inspector/src/</InlineCode>,
                                    'RPC layer, account classifier/normalizer/router, transaction normalizer + decode cascade, telemetry.',
                                ],
                                [
                                    'Low-level parsers',
                                    <InlineCode key="l">packages/parsers</InlineCode>,
                                    'Shared instruction/account parsers, extracted as a package to enable reuse beyond the app.',
                                ],
                                [
                                    'IDL decoding',
                                    <InlineCode key="l">packages/idl-decode</InlineCode>,
                                    'On-chain IDL discovery and decode used by the idl cascade step.',
                                ],
                            ]}
                        />
                        <p className="m-0">
                            <Strong>Roadmap note:</Strong> enrichment modules for program verification (Otter Verify),
                            security.txt, and Squads multisig already exist in the package but are not yet wired into{' '}
                            <InlineCode>inspect_entity</InlineCode> output.
                        </p>
                    </DocSection>

                    {/* Next-topic link; the description reuses the overview catalog copy. */}
                    <PagerLink chunk={nextChunk} onSelect={select} />
                </div>
            </div>

            <p className="mb-0 mt-12 text-xs text-neutral-500">
                Endpoint of this deployment: <InlineCode>{origin}/mcp</InlineCode>
            </p>
        </div>
    );
}

function PagerLink({
    chunk,
    onSelect,
}: {
    chunk: (typeof ADVANCED_CHUNKS)[number];
    onSelect: (anchor: string) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect(chunk.anchor)}
            className="cursor-pointer rounded-xl border border-solid border-white/10 bg-transparent p-4 text-left transition-colors hover:border-dark-accent sm:p-6"
        >
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-neutral-500">
                Next
                <ArrowRight size={12} aria-hidden />
            </span>
            <span className="mt-1.5 block text-sm font-medium text-white">{chunk.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-neutral-400">{chunk.gives}</span>
        </button>
    );
}

function SubTitle({ children }: { children: ReactNode }) {
    return <h3 className="mb-0 mt-2 text-lg font-medium text-white">{children}</h3>;
}

function Strong({ children }: { children: ReactNode }) {
    return <span className="font-medium text-neutral-100">{children}</span>;
}

function NumberedList({ items }: { items: ReactNode[] }) {
    return (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {items.map((item, index) => (
                <li key={index} className="flex gap-3">
                    <span className="shrink-0 font-mono text-xs leading-6 text-neutral-600">{index + 1}</span>
                    <span>{item}</span>
                </li>
            ))}
        </ol>
    );
}

function DocTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
    return (
        <DocCard className="overflow-hidden">
            <Table className="bg-transparent text-sm">
                <TableHeader className="bg-heavy-metal-900 [&_tr]:border-white/10">
                    <TableRow className="border-white/10">
                        {head.map(title => (
                            <TableHead
                                key={title}
                                className="px-4 py-2.5 text-left text-xs font-medium text-neutral-400"
                            >
                                {title}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((cells, rowIndex) => (
                        <TableRow key={rowIndex} className="border-white/10">
                            {cells.map((cell, cellIndex) => (
                                <TableCell
                                    key={cellIndex}
                                    className="px-4 py-3 align-top text-xs leading-relaxed text-neutral-300 [overflow-wrap:anywhere]"
                                >
                                    {cell}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </DocCard>
    );
}
