'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowRight,
    BookOpen,
    Check,
    Copy,
    ExternalLink,
    Link2,
    MessageSquare,
    RotateCcw,
    Terminal,
    Tool,
    XCircle,
} from 'react-feather';

import { cn } from '@/app/components/shared/utils';
import { useReducedMotion } from '@/app/shared/lib/use-reduced-motion';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';

import { answerCost, MCP_EXAMPLES, type McpExample, revealAnswer, type RevealedBlock } from '../lib/example-answers';
import { AGENT_INSTRUCTIONS_SNIPPET, AGENT_INSTRUCTIONS_TARGETS, SETUP_CLIENTS } from '../lib/setup-clients';
import { INSPECT_ENTITY_RESPONSE } from '../lib/tool-reference';
import { useDeploymentOrigin } from '../lib/useDeploymentOrigin';

/*
 * "Dark editorial" — full-bleed editorial layout: a numbered left rail on wide
 * screens, hairline rules instead of cards, one interactive chat for examples.
 *
 * Palette (variant-local, hence the literal hex; the accent is the shared
 * `dark-accent` token):
 *   #0A0E0D page · #121716 raised · #0D1211 sunken · #242E2B hairline
 *   #1DD79B accent (= dark-accent) · #0D3D31 accent wash · #06251C on-accent
 *   #EDF2F0 text · #8B9B94 muted · #5C6B65 dim · #3A4640 faint
 *
 * Four widths are drawn in the design; they map onto the breakpoints as
 * base → 375, sm → 768, lg → 1024, xxl → 1440.
 */

/** Horizontal gutter, shared by every full-bleed band. */
const GUTTER = 'px-5 sm:px-8 lg:px-10 xxl:px-14';

/** Top hairline that separates the bands. */
const BAND_RULE = 'border-0 border-t border-solid border-[#242E2B]';

const MONO_LABEL = 'font-mono text-[12px] uppercase tracking-[1.4px]';

const SECTIONS = [
    { Icon: Terminal, id: 'setup', kicker: 'Setup' },
    { Icon: BookOpen, id: 'instructions', kicker: 'Instructions' },
    { Icon: Tool, id: 'tools', kicker: 'Tools' },
    { Icon: MessageSquare, id: 'examples', kicker: 'Examples' },
] as const;

type EndpointStatus = { state: 'checking' | 'ready' | 'disabled'; ms?: number };

const MCP_README = 'https://github.com/solana-foundation/explorer/blob/master/app/mcp/README.md';

export function McpDocsOverviewViewV3() {
    const origin = useDeploymentOrigin();
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
        <div
            className="w-full bg-[#0A0E0D] text-[#EDF2F0]"
            style={{
                backgroundImage: 'radial-gradient(ellipse 55% 17% at 12% 4%, #1DD79B26 0%, #1DD79B00 100%)',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <Hero status={status} origin={origin} />
            <SectionTabs />
            <NumberedBand section={SECTIONS[0]} flushTop>
                <Setup origin={origin} />
            </NumberedBand>
            <NumberedBand section={SECTIONS[1]}>
                <Instructions />
            </NumberedBand>
            <NumberedBand section={SECTIONS[2]}>
                <Tools />
            </NumberedBand>
            <NumberedBand section={SECTIONS[3]}>
                <Examples />
            </NumberedBand>
            <ClosingCta />
        </div>
    );
}

/**
 * Sticky anchor tabs under the hero — a scroll-spy nav that mirrors the numbered bands' rhythm:
 * a "Sections" rail label on the left (desktop) with the tabs aligned to the content column.
 * Full-width (`w-full`, no 100vw break-out) so it never adds horizontal scroll.
 */
function SectionTabs() {
    const barRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<string>(SECTIONS[0].id);
    // The bar keeps its bottom hairline at all times, but only fills with a background once it sticks
    // to the top (i.e. after scrolling begins) so it can cover the content sliding underneath.
    const [stuck, setStuck] = useState(false);

    // Flip `stuck` the moment the bar pins to the top: a -1px top root margin with threshold 1 makes
    // it stop fully intersecting exactly when its top edge reaches the viewport top.
    useEffect(() => {
        const el = barRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
            rootMargin: '-1px 0px 0px 0px',
            threshold: [1],
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Scroll-spy: the active tab is the last section whose top has crossed into the upper third of
    // the content sitting below the sticky bar.
    useEffect(() => {
        const update = () => {
            const barHeight = barRef.current?.getBoundingClientRect().height ?? 0;
            const threshold = window.scrollY + barHeight + window.innerHeight * 0.3;
            let current: string = SECTIONS[0].id;
            for (const section of SECTIONS) {
                const el = document.getElementById(section.id);
                if (el && el.getBoundingClientRect().top + window.scrollY <= threshold) current = section.id;
            }
            setActive(current);
        };
        window.addEventListener('scroll', update, { passive: true });
        update();
        return () => window.removeEventListener('scroll', update);
    }, []);

    const scrollTo = (id: string) => (event: React.MouseEvent) => {
        event.preventDefault();
        const target = document.getElementById(id);
        if (!target) return;
        const barHeight = barRef.current?.getBoundingClientRect().height ?? 0;
        window.scrollTo({
            behavior: 'smooth',
            top: target.getBoundingClientRect().top + window.scrollY - barHeight - 10,
        });
    };

    return (
        <div
            ref={barRef}
            className={cn(
                'sticky top-0 z-10 w-full border-0 border-y border-solid border-[#242E2B] transition-colors',
                stuck ? 'bg-[#0A0E0D]' : 'bg-transparent',
                GUTTER,
            )}
        >
            <div className="flex lg:items-center lg:gap-14">
                {/* Rail label, desktop only — balances the rhythm with each numbered band's rail below. */}
                <span className={cn(MONO_LABEL, 'hidden text-[#8B9B94] lg:block lg:w-[20vw] lg:shrink-0')}>
                    Sections
                </span>
                <div
                    role="tablist"
                    className="flex min-w-0 flex-1 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {SECTIONS.map(section => {
                        const isActive = active === section.id;
                        return (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                role="tab"
                                aria-selected={isActive}
                                onClick={scrollTo(section.id)}
                                className={cn(
                                    'shrink-0 whitespace-nowrap border-0 border-b border-solid bg-transparent px-0 py-4 text-sm no-underline transition-colors',
                                    isActive
                                        ? 'border-dark-accent text-[#EDF2F0]'
                                        : 'border-transparent text-[#8B9B94] hover:text-[#EDF2F0]',
                                )}
                            >
                                {section.kicker}
                            </a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Hero({ origin, status }: { origin: string; status: EndpointStatus }) {
    // The gravity field spans this whole band, so the dots drift in across the full
    // width and height of the gradient block rather than just around the button.
    const fieldRef = useRef<HTMLDivElement>(null);

    // The endpoint the way you'd say it out loud, without the scheme. It sits beside its own
    // live-status line in the first column, so the ledger on the right lists the four facts
    // worth stating up front: transport, auth, clusters and tools.
    const host = origin.replace('https://', '').replace('http://', '');
    const facts = [
        { key: 'Transport', value: 'Streamable HTTP, stateless' },
        { key: 'Auth', value: 'Open — no key required' },
        { key: 'Clusters', value: 'mainnet-beta · devnet · testnet · simd296' },
        { key: 'Tools', value: 'inspect_entity · ping' },
    ];

    return (
        // `overflow-hidden`: the gravity field fills the band and must not widen the page.
        <div
            ref={fieldRef}
            className={cn('relative w-full overflow-hidden pb-7 pt-12 sm:pt-[60px]', GUTTER, BAND_RULE)}
        >
            {/* Content sits above the portaled gravity canvas (which is z-0 in this band). */}
            <div className="relative z-[1] flex w-full flex-col gap-9">
                {/* Top strip (Model Context Protocol) — hidden for now.
                <div className="flex w-full items-center gap-4">
                    <span className={cn(MONO_LABEL, 'whitespace-nowrap tracking-[1.5px] text-[#8B9B94]')}>
                        Model Context Protocol
                    </span>
                    <span className="h-px flex-1 bg-[#242E2B]" />
                    <span
                        className={cn(MONO_LABEL, 'hidden whitespace-nowrap tracking-[1.5px] text-[#8B9B94] sm:inline')}
                    >
                        Read-only · no API key
                    </span>
                </div>
                */}

                <h1 className="m-0 mt-[72px] text-[34px] font-normal leading-[37px] tracking-[-1.1px] text-[#EDF2F0] sm:mt-[108px] sm:text-[46px] sm:leading-[48px] sm:tracking-[-1.5px] lg:text-[58px] lg:leading-[60px] lg:tracking-[-1.9px] xxl:text-[72px] xxl:leading-[75px] xxl:tracking-[-2.4px]">
                    Live on-chain data for coding&nbsp;agents
                </h1>

                {/* The heading→intro gap is halved on mobile and tablet (`-mt-6`, reset at `lg`),
                    and the gap after the CTA (the stacked column gap) is doubled — `gap-[52px]` on
                    mobile, `sm:gap-[60px]` on tablet. */}
                <div className="-mt-6 flex w-full flex-col gap-[52px] pt-3 sm:gap-[60px] lg:mt-0 lg:flex-row lg:gap-16">
                    {/* First column: the pitch, the call to action, and the endpoint. */}
                    <div className="flex w-full flex-col items-start gap-7 lg:flex-1">
                        <p className="m-0 text-[15px] leading-[25px] text-[#8B9B94] sm:text-[18px] sm:leading-[30px] lg:max-w-[720px]">
                            Connect your MCP client to the Explorer and let your agent read decoded on-chain state —
                            accounts, programs, tokens and transactions — with the same IDL decoding and enrichments the
                            Explorer renders.
                        </p>
                        <GravityCta
                            href="#setup"
                            fieldRef={fieldRef}
                            className="text-[15px]"
                            mobileDotScale={2}
                            mobilePullScale={0.85}
                            zoneTop={1 / 3}
                            zoneBottom={2 / 3}
                        >
                            Give your agent the context
                        </GravityCta>
                    </div>
                    {/* Second column: the four facts, key and value on one row with a hairline
                        between them — a compact ledger that reads like a tight table. */}
                    <div className="flex w-full flex-col lg:w-[30vw]">
                        {/* Endpoint and its status, one block sitting above the ledger. A vertical
                            pill on the left carries the status colour across both lines; the address
                            gets an inline copy button that wraps along with it. */}
                        <div className="flex w-full items-stretch gap-2.5 border-0 border-b border-solid border-[#242E2B] pb-3.5 lg:max-w-[400px]">
                            <span
                                aria-hidden
                                className={cn(
                                    'my-0.5 w-0.5 shrink-0 self-stretch rounded-full',
                                    status.state === 'ready' ? 'bg-dark-accent' : 'bg-[#8B9B94]',
                                )}
                            />
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <EndpointAddress display={`${host}/mcp`} value={`${origin}/mcp`} />
                                <StatusNote status={status} />
                            </div>
                        </div>
                        {/* Four facts: a 2×2 grid with cross divider lines on mobile and tablet, a
                            single inline list from `lg` up. */}
                        <div className="grid grid-cols-2 lg:flex lg:max-w-[400px] lg:flex-col">
                            {facts.map((fact, index) => (
                                <div
                                    key={fact.key}
                                    className={cn(
                                        // Stacked (key over value) grid cell on mobile and tablet like v3,
                                        // with a bottom rule under the top row only; an inline list row
                                        // with a top rule from `lg` up.
                                        'flex min-w-0 flex-col gap-2 border-0 border-solid border-[#242E2B] py-3.5',
                                        'lg:flex-row lg:items-baseline lg:gap-4 lg:border-b-0 lg:py-2.5',
                                        index % 2 === 0 ? 'pr-5 lg:pr-0' : 'pl-5 lg:pl-0',
                                        index < 2 && 'border-b lg:border-b-0',
                                        index > 0 && 'lg:border-t',
                                    )}
                                >
                                    <div className="flex items-center gap-2 lg:w-[90px] lg:shrink-0">
                                        <span className={cn(MONO_LABEL, 'text-[#8B9B94]')}>{fact.key}</span>
                                    </div>
                                    <span className="text-[13.5px] leading-5 text-[#EDF2F0] [overflow-wrap:anywhere] lg:flex-1">
                                        {fact.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Endpoint liveness in one short word — enabled/disabled, with a how-to-run link when off. */
function StatusNote({ status }: { status: EndpointStatus }) {
    if (status.state === 'checking') {
        return <span className="text-[13px] text-[#8B9B94]">Checking…</span>;
    }
    if (status.state === 'disabled') {
        return (
            <span className="flex w-fit items-center text-[13px] text-[#8B9B94]">
                Disabled
                <span className="mx-1.5 text-[#5C6B65]" aria-hidden>
                    —
                </span>
                <a
                    href={MCP_README}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-dark-accent no-underline"
                >
                    How to run
                    <ExternalLink size={11} aria-hidden />
                </a>
            </span>
        );
    }
    return <span className="text-[13px] text-dark-accent">Ready</span>;
}

/** Copy state as an icon — the project's shared copy affordance (see CodeCard, CopyableEndpoint). */
const COPY_ICON = {
    copied: <Check size={12} aria-hidden />,
    copy: <Copy size={12} aria-hidden />,
    errored: <XCircle size={12} aria-hidden />,
};

/**
 * The endpoint address as plain mono text with an inline copy button. The button is inline-flow,
 * not a flex child, so when the address wraps it wraps with it like one more character on the line.
 *
 * The address itself also copies on a double click — the gesture people already try on a URL —
 * and hands back the same full value as the button, scheme included, not just the shown host.
 */
function EndpointAddress({ display, value }: { display: string; value: string }) {
    const [state, copy] = useCopyToClipboard(1000);
    return (
        <span className="font-mono text-sm text-[#EDF2F0] [overflow-wrap:anywhere]">
            <span className="cursor-copy" onDoubleClick={() => copy(value)} title="Double-click to copy">
                {display}
            </span>
            <button
                type="button"
                aria-label="Copy endpoint to clipboard"
                onClick={() => copy(value)}
                className={cn(
                    'ml-1 inline-flex size-5 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 align-middle',
                    'text-[#5C6B65] hover:bg-[#242E2B] hover:text-[#EDF2F0]',
                    state === 'copied' && 'text-dark-accent hover:text-dark-accent',
                    state === 'errored' && 'text-red-500 hover:text-red-500',
                )}
            >
                {COPY_ICON[state]}
            </button>
        </span>
    );
}

/*
 * Gravity field around the primary call to action.
 *
 * Green dots drift in from the edges of an invisible field and fall towards the
 * button — real inverse-square attraction, so they visibly accelerate. A hit makes
 * the button swell by an amount proportional to the dot's area, and hits stack, so
 * a cluster arriving together lands harder than one stray dot. Hovering nudges the
 * button towards the pointer: nothing at the centre, the full offset at the edge.
 *
 * All of it is driven from one rAF loop writing a single transform — no React state
 * per frame. It idles when scrolled out of view and never starts under reduced motion.
 */
const CTA_FIELD_X = 110;
const CTA_FIELD_Y = 70;
/** Attraction constant, tuned so a dot crosses the field in roughly a second. */
const CTA_GRAVITY = 260_000;
/**
 * Distance (px) the attraction constant is quoted at: the pull at CTA_GRAVITY_REF is the same
 * whatever the falloff, so the exponent below re-shapes the curve instead of rescaling it.
 */
const CTA_GRAVITY_REF = 200;
/**
 * How steeply the pull falls off with distance. 2 is textbook inverse-square: nearly all of the
 * pull sits in the last few dozen px, so the field barely reaches and the dots then whip into the
 * button. Lower spreads the same pull out — further reach, calmer arrival.
 */
const CTA_GRAVITY_FALLOFF = 2;
/**
 * Softening length (px): the pull is measured against sqrt(d² + s²) rather than d, so it levels
 * off instead of blowing up as a dot closes in. A larger value is a wider, gentler landing.
 */
const CTA_GRAVITY_SOFTENING = 24;
const CTA_MAX_DOTS = 2600;
const CTA_SPAWNS_PER_SECOND = 1100;
/**
 * Phones run half the field: same look, half the dots to integrate and draw. Matched as a
 * media-query list rather than a width alone, so a phone turned to landscape — wider than the
 * breakpoint — keeps the reduced count.
 */
/**
 * Sub-pixel slack in the "scrolled to the bottom" test. Fractional device pixels leave the maximum
 * scroll position a hair short of the exact page height, so an exact comparison can never become
 * true — this is float tolerance, not an activation area.
 */
const CTA_SCROLL_EPSILON = 2;
const CTA_MOBILE_QUERY = '(hover: none), (max-width: 767px)';
const CTA_MOBILE_DOT_DIVISOR = 2;
/**
 * And the swarm the pull builds is halved once more on top of that, since the pull is where a
 * phone has the most dots on screen at once: 2.5× the resting field instead of the full 5×.
 */
const CTA_MOBILE_PULL_DOT_DIVISOR = 2;
/**
 * While the pointer is over the button both the dot cap and the spawn rate are multiplied
 * by this, so a hover pulls in a swarm five times denser than the resting field. Off-hover
 * the cap drops back and the excess fades away over the next second.
 */
const CTA_HOVER_DOT_MULTIPLIER = 5;
/**
 * Off-hover the field eases back to a uniform resting spread on this exponential time constant
 * (seconds): the count decays smoothly toward the cap and never dips below it, and the clump the
 * gravity left is recycled into the bald patches over the same window — no crash-then-refill.
 */
const CTA_DRAIN_TAU = 0.4;
/** A cell holding more than this multiple of the average density is treated as over-crowded. */
const CTA_REDIST_OVERFILL = 1.5;
const CTA_HOVER_SCALE = 1.02;
const CTA_HOVER_SHIFT = 6;
/**
 * Relative frequency of each dot-size gradation, in px. The 3–6px tail is graded into
 * single-px steps with a uniform drop (0.08 → 0.06 → 0.04 → 0.02) that keeps the same 0.2
 * total, so it slots into the overall descending scale rather than a lump:
 *   1px·10, 2px·1.6, 3px·0.08, 4px·0.06, 5px·0.04, 6px·0.02.
 */
const CTA_DOT_SIZES = [
    { max: 1, min: 1, weight: 10 },
    { max: 2, min: 2, weight: 1.6 },
    { max: 3, min: 3, weight: 0.08 },
    { max: 4, min: 4, weight: 0.06 },
    { max: 5, min: 5, weight: 0.04 },
    { max: 6, min: 6, weight: 0.02 },
];
const CTA_DOT_WEIGHT = CTA_DOT_SIZES.reduce((sum, bucket) => sum + bucket.weight, 0);
/** Density-grid cell size (px) used to place new dots where the field is sparsest. */
const CTA_CELL = 90;
/** Big dots (target size above this) grow in from a 1px point over CTA_GROW_SECONDS. */
const CTA_GROW_MIN_SIZE = 2;
const CTA_GROW_SECONDS = 1;
/**
 * Gradations above this size are a gravity-only spark: they are drawn only while the pull is on,
 * and the moment it stops every one still in the field fades out — so the biggest dots stay tied
 * to the gravity and the resting field settles back to 1–CTA_IDLE_MAX_SIZE px.
 */
const CTA_IDLE_MAX_SIZE = 3;
const CTA_IDLE_WEIGHT = CTA_DOT_SIZES.reduce(
    (sum, bucket) => (bucket.min <= CTA_IDLE_MAX_SIZE ? sum + bucket.weight : sum),
    0,
);
/**
 * The big gradations, sampled when twinkling a fresh big dot in: above CTA_GROW_MIN_SIZE, so they
 * grow in and out, and no larger than CTA_IDLE_MAX_SIZE, since twinkling only happens at idle.
 */
const CTA_BIG_BUCKETS = CTA_DOT_SIZES.filter(
    bucket => bucket.min > CTA_GROW_MIN_SIZE && bucket.min <= CTA_IDLE_MAX_SIZE,
);
const CTA_BIG_WEIGHT = CTA_BIG_BUCKETS.reduce((sum, bucket) => sum + bucket.weight, 0);
/**
 * Big dots have a finite life so they twinkle in and out at idle: each lives this long (at
 * full size, picked in the range) then fades out while a fresh one grows in elsewhere.
 */
const CTA_BIG_LIFE_MIN = 3;
const CTA_BIG_LIFE_MAX = 10;
/** Hovering ramps gravity up to this multiple over 200ms; unhover switches it off at once. */
const CTA_HOVER_GRAVITY = 2000;
const CTA_GRAVITY_RAMP_SECONDS = 0.2;
/**
 * Off-hover, directed motion is killed: the velocity is damped toward zero so the
 * rush stops and only the ambient fluctuation is left. While hovering, gravity drives
 * the dots and this drag stays out of the way.
 */
const CTA_STOP_DRAG = 10;
/**
 * Ambient fluctuation: a slow per-dot drift running as its own OU process, decoupled from
 * the stop drag so its speed can be tuned without touching how directed motion halts.
 * CTA_FLUX_DRAG sets the timescale (lower = slower), CTA_FLUX_ACCEL the amplitude.
 */
const CTA_FLUX_DRAG = 2;
const CTA_FLUX_ACCEL = 368;
/** Swell per unit of dot area, and the ceiling however many arrive at once. */
const CTA_HIT_GAIN = 0.0022 / 3;
const CTA_HIT_CEILING = 0.16 / 3;

type CtaDot = {
    age: number;
    /** 0 while alive; once removed, seconds into the fade-out before it is dropped. */
    dying: number;
    /** Age at which a big dot starts fading (Infinity for small dots, which persist). */
    life: number;
    size: number;
    vx: number;
    vy: number;
    wx: number;
    wy: number;
    x: number;
    y: number;
};

function GravityCta({
    children,
    className,
    dotScale = 1,
    falloff = CTA_GRAVITY_FALLOFF,
    fieldRef,
    flightSpeedScale = 1,
    href,
    mobileDotScale = 1,
    mobilePullScale = 1,
    pageBottomGap,
    softening = CTA_GRAVITY_SOFTENING,
    wrapClassName,
    zoneBottom = 0.625,
    zoneTop = 0.375,
}: {
    children: React.ReactNode;
    className?: string;
    /**
     * How dense this band's field is, as a factor on the standard budget — every device, not just
     * phones, and the swarm under gravity scales with it. A band with less room, or one that reads
     * as busy next to its copy, takes a thinner field.
     */
    dotScale?: number;
    /**
     * Falloff exponent of the pull for this band (default CTA_GRAVITY_FALLOFF). Below 2 the field
     * reaches further and eases off near the button, which reads as a calmer, less busy band.
     */
    falloff?: number;
    /**
     * When given, the gravity field spans this element (a whole band) instead of a
     * small box around the button, and the dot canvas is portaled into it — so the
     * dots drift in from the full width and height of the block, not just the button.
     */
    fieldRef?: React.RefObject<HTMLElement | null>;
    /**
     * How fast the dots fly in, as a factor on the resting 1× — every device, not just phones.
     * Arrival speed goes as the square root of the attraction, so the constant is scaled by the
     * square of this and 0.5 really is half the speed. A calmer band reads as a slower drift in.
     */
    flightSpeedScale?: number;
    href: string;
    /**
     * Per-band tuning of the mobile dot budget: the phone caps (resting and pull alike) are
     * multiplied by this. Desktop is untouched. Bands differ in how much room the field has and
     * how much else is on screen, so the hero can afford a denser field than the closing CTA.
     */
    mobileDotScale?: number;
    /**
     * Per-band tuning of the mobile cap under gravity only, applied on top of `mobileDotScale`:
     * how dense the swarm the pull is allowed to build gets, with the resting field left alone.
     */
    mobilePullScale?: number;
    /**
     * Softening length in px for this band (default CTA_GRAVITY_SOFTENING) — how wide the flat
     * spot around the button is, i.e. how early the arriving dots stop accelerating.
     */
    softening?: number;
    /**
     * Touch-only, like the `zoneTop`/`zoneBottom` band it replaces: gravity switches on once the page
     * is scrolled to within this many px of its bottom — for the closing CTA, which lives at the very
     * end of the page. On hover-capable devices the pointer drives gravity instead.
     */
    pageBottomGap?: number;
    wrapClassName?: string;
    /**
     * Touch-only activation band, as viewport-height fractions: gravity switches on while the
     * button's centre sits between `zoneTop·vh` and `zoneBottom·vh`. Defaults to the middle quarter.
     */
    zoneBottom?: number;
    zoneTop?: number;
}) {
    const reduced = useReducedMotion();
    const wrapRef = useRef<HTMLSpanElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const linkRef = useRef<HTMLAnchorElement>(null);
    // Written by pointer handlers, read by the loop — never a re-render.
    const pointerRef = useRef<{ x: number; y: number } | undefined>(undefined);
    // Touch has no hover, so gravity is driven by scroll instead: true while the button sits in
    // the middle quarter of the viewport. Written by a scroll listener, read by the loop.
    const zoneRef = useRef(false);
    // The portal target, resolved after mount so the canvas can be a child of the band.
    const [fieldEl, setFieldEl] = useState<HTMLElement | undefined>(undefined);

    useEffect(() => {
        setFieldEl(fieldRef?.current ?? undefined);
    }, [fieldRef]);

    useEffect(() => {
        if (reduced) return;
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        const link = linkRef.current;
        const ctx = canvas?.getContext('2d');
        if (!wrap || !canvas || !link || !ctx) return;

        // Attraction for this band. A dot's arrival speed goes as the square root of the constant,
        // so squaring the scale is what makes `flightSpeedScale` read as a speed: 0.5 → a quarter
        // of the pull → half the speed.
        const gravity = CTA_GRAVITY * flightSpeedScale * flightSpeedScale;
        // The constant is quoted as the acceleration at CTA_GRAVITY_REF, so changing the falloff
        // re-shapes the curve without re-scaling the whole field: the pull at the reference
        // distance is the same for any exponent, and only its distribution over distance moves.
        const refAccel = gravity / (CTA_GRAVITY_REF * CTA_GRAVITY_REF);
        const inverseSquare = falloff === 2;

        let width = 0;
        let height = 0;
        // The button's box inside the field, measured on the untransformed wrapper so
        // the button's own movement can't feed back into the measurement.
        let centerX = 0;
        let centerY = 0;
        let halfW = 0;
        let halfH = 0;

        // In field mode the canvas fills the band (`inset-0`) and the button is a target
        // somewhere inside it. In local mode the field is a small box padded around the
        // button. Either way the button is measured on the untransformed wrapper, so its
        // own movement can't feed back into the measurement.
        const measure = () => {
            const box = wrap.getBoundingClientRect();
            halfW = box.width / 2;
            halfH = box.height / 2;
            if (fieldEl) {
                const fieldBox = fieldEl.getBoundingClientRect();
                width = fieldBox.width;
                height = fieldBox.height;
                centerX = box.left - fieldBox.left + halfW;
                centerY = box.top - fieldBox.top + halfH;
            } else {
                width = box.width + CTA_FIELD_X * 2;
                height = box.height + CTA_FIELD_Y * 2;
                centerX = CTA_FIELD_X + halfW;
                centerY = CTA_FIELD_Y + halfH;
            }
            const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(wrap);
        if (fieldEl) observer.observe(fieldEl);

        const dots: CtaDot[] = [];

        // Size is drawn from the weighted buckets: mostly 1–2px, rarely 6px. At idle the draw stops
        // at CTA_IDLE_MAX_SIZE, so the sparks the fade-out clears aren't spawned straight back in.
        const randomSize = (idle: boolean) => {
            let ticket = Math.random() * (idle ? CTA_IDLE_WEIGHT : CTA_DOT_WEIGHT);
            for (const bucket of CTA_DOT_SIZES) {
                if (idle && bucket.min > CTA_IDLE_MAX_SIZE) break;
                if (ticket < bucket.weight) return bucket.min + Math.random() * (bucket.max - bucket.min);
                ticket -= bucket.weight;
            }
            return 1;
        };
        const drift = () => (Math.random() - 0.5) * 30;

        const bigSize = () => {
            let ticket = Math.random() * CTA_BIG_WEIGHT;
            for (const bucket of CTA_BIG_BUCKETS) {
                if (ticket < bucket.weight) return bucket.min + Math.random() * (bucket.max - bucket.min);
                ticket -= bucket.weight;
            }
            return CTA_BIG_BUCKETS[CTA_BIG_BUCKETS.length - 1].min;
        };

        // Create one dot at (x, y). Big dots get a finite life so they twinkle in and out at
        // idle; small dots get an infinite life and persist as the static field.
        const makeDot = (size: number, x: number, y: number) => {
            const big = size > CTA_GROW_MIN_SIZE;
            dots.push({
                age: 0,
                dying: 0,
                life: big
                    ? CTA_GROW_SECONDS + CTA_BIG_LIFE_MIN + Math.random() * (CTA_BIG_LIFE_MAX - CTA_BIG_LIFE_MIN)
                    : Infinity,
                size,
                vx: drift(),
                vy: drift(),
                wx: 0,
                wy: 0,
                x,
                y,
            });
        };

        // Start one dot's fade-out in place, freezing the size it had actually grown to so a dot
        // caught mid-grow-in shrinks away from there instead of popping to full size first.
        const startFade = (dot: CtaDot, dt: number) => {
            const t = Math.min(dot.age / CTA_GROW_SECONDS, 1);
            dot.size = 1 + (dot.size - 1) * t * (2 - t);
            dot.dying = dt;
        };

        // A random point in the sparsest cell of a coarse density grid, so new dots fill in
        // where the field is thin rather than clumping — the "spawn where they're few" pass,
        // done at spawn time instead of by shuffling settled dots (which would flicker).
        const sparseXY = (): [number, number] => {
            const cols = Math.max(1, Math.floor(width / CTA_CELL));
            const rows = Math.max(1, Math.floor(height / CTA_CELL));
            const counts = new Int32Array(cols * rows);
            for (const dot of dots) {
                if (dot.dying > 0) continue;
                const cx = Math.min(cols - 1, Math.max(0, Math.floor((dot.x / width) * cols)));
                const cy = Math.min(rows - 1, Math.max(0, Math.floor((dot.y / height) * rows)));
                counts[cy * cols + cx]++;
            }
            let sparsest = 0;
            for (let cell = 1; cell < counts.length; cell++) {
                if (counts[cell] < counts[sparsest]) sparsest = cell;
            }
            return [
                ((sparsest % cols) + Math.random()) * (width / cols),
                (Math.floor(sparsest / cols) + Math.random()) * (height / rows),
            ];
        };

        // Spawn one dot at a random point across the whole field, not just the border.
        // Replacements land everywhere, so absorbing a hover's central cloud and refilling
        // it doesn't leave a hole in the middle while the edges slowly drift back in.
        const spawn = (idle: boolean) => makeDot(randomSize(idle), Math.random() * width, Math.random() * height);
        // A guaranteed big dot, placed where the field is sparsest — twinkles a fresh one in
        // when another ages out.
        const spawnBig = () => makeDot(bigSize(), ...sparseXY());

        // Dot caps for this device: the resting field, and the swarm the pull is allowed to build.
        // On a phone both are halved, the pull's cap is halved once more, and the band's own
        // `mobileDotScale` scales what is left. Re-read when the query flips (rotation, a resized
        // window): a field left above the new cap is eased down by the idle drain below, and one
        // below it is refilled by the steady spawn — neither needs handling here.
        const mobile = window.matchMedia(CTA_MOBILE_QUERY);
        let restingDots = CTA_MAX_DOTS;
        let pullDots = CTA_MAX_DOTS * CTA_HOVER_DOT_MULTIPLIER;
        const updateDotCaps = () => {
            restingDots = Math.round(
                mobile.matches
                    ? (CTA_MAX_DOTS / CTA_MOBILE_DOT_DIVISOR) * mobileDotScale * dotScale
                    : CTA_MAX_DOTS * dotScale,
            );
            pullDots = mobile.matches
                ? Math.round((restingDots * CTA_HOVER_DOT_MULTIPLIER * mobilePullScale) / CTA_MOBILE_PULL_DOT_DIVISOR)
                : restingDots * CTA_HOVER_DOT_MULTIPLIER;
        };
        updateDotCaps();
        mobile.addEventListener('change', updateDotCaps);

        // Initial seed just fills up to the cap using the same area spawn, at rest so it starts
        // out as the resting field rather than one holding sparks no gravity ever pulled in.
        const seed = () => {
            while (dots.length < restingDots) spawn(true);
        };
        seed();

        let swell = 0;
        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;
        let spawnDebt = 0;
        let last = 0;
        let frame = 0;
        let running = false;
        // 0 when idle; ramps toward CTA_HOVER_GRAVITY while the pointer is over the button.
        let gravityScale = 0;
        // Last frame's gravity state, so the frame it switches off can flush the big sparks.
        let wasActive = false;

        const step = (now: number) => {
            const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20);
            last = now;

            // Gravity is on while the pointer is over the button (desktop hover) or the button
            // has scrolled into the middle quarter of the viewport (touch, no hover). It ramps up
            // over CTA_GRAVITY_RAMP_SECONDS and switches off instantly when neither holds; the
            // always-on drag then eases the in-flight dots back to their drift.
            const active = pointerRef.current !== undefined || zoneRef.current;
            if (active) {
                gravityScale = Math.min(
                    CTA_HOVER_GRAVITY,
                    gravityScale + (CTA_HOVER_GRAVITY / CTA_GRAVITY_RAMP_SECONDS) * dt,
                );
            } else {
                gravityScale = 0;
            }

            // The frame the pull stops, every spark above CTA_IDLE_MAX_SIZE starts fading out where
            // it stands — the same shrink-and-fade a twinkle ends on — and the now idle-capped spawn
            // refills the gaps with small dots, so no oversized dot is left sitting in the field.
            if (wasActive && !active) {
                for (const dot of dots) {
                    if (dot.dying === 0 && dot.size > CTA_IDLE_MAX_SIZE) startFade(dot, dt);
                }
            }
            wasActive = active;

            // Active lifts both the cap and the spawn rate together, so the field densifies to
            // five times its resting size while gravity is pulling.
            const hovering = active;
            const maxDots = hovering ? pullDots : restingDots;
            const spawnRate = hovering ? CTA_SPAWNS_PER_SECOND * CTA_HOVER_DOT_MULTIPLIER : CTA_SPAWNS_PER_SECOND;

            spawnDebt += dt * spawnRate;
            while (spawnDebt >= 1) {
                spawnDebt -= 1;
                if (dots.length < maxDots) spawn(!active);
            }

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#1DD79B';

            for (let index = dots.length - 1; index >= 0; index--) {
                const dot = dots[index];

                // A removed big dot fades and shrinks away in place over CTA_GROW_SECONDS —
                // the mirror of its grow-in — instead of vanishing on the spot.
                if (dot.dying > 0) {
                    dot.dying += dt;
                    if (dot.dying >= CTA_GROW_SECONDS) {
                        dots.splice(index, 1);
                        continue;
                    }
                    const fade = 1 - dot.dying / CTA_GROW_SECONDS;
                    const dyingSize = dot.size * fade;
                    ctx.globalAlpha = 0.2 + (dyingSize / 8) * 0.55;
                    ctx.beginPath();
                    ctx.arc(dot.x, dot.y, dyingSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    continue;
                }

                dot.age += dt;

                // Idle twinkle: a big dot that has lived out its life fades away while a fresh
                // one grows in elsewhere, so big dots keep sparkling in and out even at rest.
                if (!active && dot.age >= dot.life) {
                    dot.dying = dt;
                    spawnBig();
                    continue;
                }

                const dx = centerX - dot.x;
                const dy = centerY - dot.y;
                // Softened distance: the true one out in the field, never under the softening
                // length up close, and smooth in between (no kink where a hard floor would sit).
                const softened = Math.sqrt(dx * dx + dy * dy + softening * softening);
                const drop = inverseSquare
                    ? (CTA_GRAVITY_REF * CTA_GRAVITY_REF) / (softened * softened)
                    : Math.pow(CTA_GRAVITY_REF / softened, falloff);
                const pull = refAccel * drop * gravityScale * dt;
                // Direction only — the magnitude came from the softened distance above.
                const distance = Math.max(Math.hypot(dx, dy), 0.001);
                dot.vx += (dx / distance) * pull;
                dot.vy += (dy / distance) * pull;

                // Off-hover, damp the velocity toward zero so the directed rush comes to a
                // stop instead of drifting on in a straight line; while hovering, gravity is
                // in charge and the drag stays out of the way.
                if (!active) {
                    const damp = Math.exp(-dt * CTA_STOP_DRAG);
                    dot.vx *= damp;
                    dot.vy *= damp;
                }

                // Ambient fluctuation: its own slow OU drift, independent of the stop drag,
                // so it stays as a gentle sway once directed motion has stopped.
                const fluxDamp = Math.exp(-dt * CTA_FLUX_DRAG);
                dot.wx = dot.wx * fluxDamp + (Math.random() - 0.5) * CTA_FLUX_ACCEL * dt;
                dot.wy = dot.wy * fluxDamp + (Math.random() - 0.5) * CTA_FLUX_ACCEL * dt;

                dot.x += (dot.vx + dot.wx) * dt;
                dot.y += (dot.vy + dot.wy) * dt;

                // The button is a pill: distance to its central segment, not to a rect.
                const segment = Math.max(0, halfW - halfH);
                const localX = dot.x - centerX;
                const localY = dot.y - centerY;
                const clamped = Math.max(-segment, Math.min(segment, localX));
                if (Math.hypot(localX - clamped, localY) <= halfH + dot.size / 2) {
                    // Area, not diameter — an 8px dot lands far harder than a 2px one.
                    swell = Math.min(CTA_HIT_CEILING, swell + dot.size * dot.size * CTA_HIT_GAIN);
                    // Big dots fade out where they land, from the size they had actually reached
                    // (a hover absorbs them well before the grow-in finishes); small ones just go.
                    if (dot.size > CTA_GROW_MIN_SIZE) {
                        startFade(dot, dt);
                    } else {
                        dots.splice(index, 1);
                    }
                    // Feed one back for every dot the button eats, so a hover — which absorbs
                    // dots far faster than the steady spawn refills — doesn't leave the field
                    // sparse once the pointer moves away.
                    if (dots.length < maxDots) spawn(!active);
                    continue;
                }

                if (dot.x < -40 || dot.x > width + 40 || dot.y < -40 || dot.y > height + 40) {
                    dots.splice(index, 1);
                    // Replace escapees too: under a hard hover, dots that graze the button
                    // slingshot out of bounds fast, and losing those unreplaced is what drains
                    // the field so a dip shows once the pointer leaves.
                    if (dots.length < maxDots) spawn(!active);
                    continue;
                }

                // Big dots grow in from a 1px point over their first second (ease-out), with
                // alpha following the visible size so they fade up as they swell.
                let renderSize = dot.size;
                if (dot.size > CTA_GROW_MIN_SIZE && dot.age < CTA_GROW_SECONDS) {
                    const t = dot.age / CTA_GROW_SECONDS;
                    renderSize = 1 + (dot.size - 1) * t * (2 - t);
                }
                ctx.globalAlpha = 0.2 + (renderSize / 8) * 0.55;
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, renderSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            const pointer = pointerRef.current;
            const targetScale = pointer ? CTA_HOVER_SCALE : 1;
            // Zero at the centre, the full shift at the edge.
            const targetX = pointer ? Math.max(-1, Math.min(1, pointer.x / halfW)) * CTA_HOVER_SHIFT : 0;
            const targetY = pointer ? Math.max(-1, Math.min(1, pointer.y / halfH)) * CTA_HOVER_SHIFT : 0;

            const ease = 1 - Math.exp(-dt * 14);
            scale += (targetScale - scale) * ease;
            offsetX += (targetX - offsetX) * ease;
            offsetY += (targetY - offsetY) * ease;
            swell *= Math.exp(-dt * 7);

            link.style.transform = `translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, 0) scale(${(scale + swell).toFixed(4)})`;

            // Off-hover, re-even the field. The pull dragged the dots into a clump by the button
            // and left bald patches the slow ambient drift never refills. Each frame, fade dots out
            // of the over-crowded cells and grow fresh ones back in the sparsest cells, while
            // net-removing whatever surplus the hover's 5× fill left — so the field eases back to a
            // uniform resting spread instead of freezing in the shape the gravity left behind.
            if (!hovering) {
                const cols = Math.max(1, Math.floor(width / CTA_CELL));
                const rows = Math.max(1, Math.floor(height / CTA_CELL));
                const counts = new Int32Array(cols * rows);
                const cellOf = (dot: CtaDot) =>
                    Math.min(rows - 1, Math.max(0, Math.floor((dot.y / height) * rows))) * cols +
                    Math.min(cols - 1, Math.max(0, Math.floor((dot.x / width) * cols)));
                let alive = 0;
                for (const dot of dots) {
                    if (dot.dying === 0) {
                        alive++;
                        counts[cellOf(dot)]++;
                    }
                }
                const rate = 1 - Math.exp(-dt / CTA_DRAIN_TAU);
                const overfill = (alive / counts.length) * CTA_REDIST_OVERFILL;
                let toDrain = Math.ceil(Math.max(0, alive - restingDots) * rate);
                let toRefill = 0;
                // Fade a slice out of the crowded cells: the surplus first (no replacement), then
                // the rest as recycling that will grow back in where the field is thin.
                for (let index = dots.length - 1; index >= 0; index--) {
                    const dot = dots[index];
                    if (dot.dying > 0) continue;
                    const cell = cellOf(dot);
                    if (counts[cell] <= overfill || Math.random() >= rate) continue;
                    dot.dying = dt;
                    counts[cell]--;
                    if (toDrain > 0) toDrain--;
                    else toRefill++;
                }
                // Any surplus left when the field is already even has no clump to thin — fade it
                // off the tail so the count still eases down to the cap.
                for (let index = dots.length - 1; index >= 0 && toDrain > 0; index--) {
                    if (dots[index].dying > 0) continue;
                    dots[index].dying = dt;
                    toDrain--;
                }
                // Regrow the recycled dots where the field is thinnest.
                while (toRefill-- > 0) {
                    let sparsest = 0;
                    for (let cell = 1; cell < counts.length; cell++) {
                        if (counts[cell] < counts[sparsest]) sparsest = cell;
                    }
                    counts[sparsest]++;
                    makeDot(
                        randomSize(true),
                        ((sparsest % cols) + Math.random()) * (width / cols),
                        (Math.floor(sparsest / cols) + Math.random()) * (height / rows),
                    );
                }
            }

            frame = requestAnimationFrame(step);
        };

        // Start straight away and let the observer only *pause* it: gating the start on the
        // observer would leave the button inert — hover included — anywhere its callback
        // never arrives (a document that is never rendered, say).
        running = true;
        frame = requestAnimationFrame(step);

        // Scrolled out of view costs nothing.
        const visibility = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting === running) return;
            running = entry.isIntersecting;
            if (running) {
                last = 0;
                frame = requestAnimationFrame(step);
            } else {
                cancelAnimationFrame(frame);
                ctx.clearRect(0, 0, width, height);
            }
        });
        visibility.observe(fieldEl ?? wrap);

        // Scroll-driven activation is touch-only (`hover: none`); on hover-capable devices the pointer
        // drives gravity and this stays off. On touch there are two cues:
        //  - `pageBottomGap` set (closing CTA): the page is scrolled to within that many px of its
        //    bottom — the button lives at the very end, so "reached the end" is the natural cue.
        //    A gap of 0 means the very bottom and nothing earlier, sub-pixel slack aside.
        //  - otherwise: the button's centre sits within the caller's activation band
        //    (`zoneTop`–`zoneBottom` of the viewport), the way a hover would on desktop.
        const coarse = window.matchMedia('(hover: none)');
        const updateZone = () => {
            if (!coarse.matches) {
                zoneRef.current = false;
                return;
            }
            if (pageBottomGap !== undefined) {
                const doc = document.documentElement;
                zoneRef.current =
                    window.scrollY + window.innerHeight >= doc.scrollHeight - pageBottomGap - CTA_SCROLL_EPSILON;
                return;
            }
            const rect = link.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            const vh = window.innerHeight;
            zoneRef.current = centerY >= vh * zoneTop && centerY <= vh * zoneBottom;
        };
        updateZone();
        window.addEventListener('scroll', updateZone, { passive: true });
        window.addEventListener('resize', updateZone);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            visibility.disconnect();
            mobile.removeEventListener('change', updateDotCaps);
            window.removeEventListener('scroll', updateZone);
            window.removeEventListener('resize', updateZone);
            link.style.transform = '';
        };
    }, [
        reduced,
        fieldEl,
        zoneTop,
        zoneBottom,
        pageBottomGap,
        mobileDotScale,
        mobilePullScale,
        flightSpeedScale,
        falloff,
        softening,
        dotScale,
    ]);

    // One canvas element, positioned either as a full-band overlay (field mode) or a
    // small box around the button (local mode). In field mode it is portaled into the
    // band so it can span the whole gradient block behind the content.
    const canvasEl = !reduced && (
        <canvas
            ref={canvasRef}
            aria-hidden
            className={cn('pointer-events-none absolute', fieldEl && 'inset-0')}
            style={fieldEl ? { zIndex: 0 } : { left: -CTA_FIELD_X, top: -CTA_FIELD_Y }}
        />
    );

    return (
        <span
            ref={wrapRef}
            className={cn('relative inline-flex', wrapClassName)}
            onPointerMove={event => {
                const box = wrapRef.current?.getBoundingClientRect();
                if (!box) return;
                pointerRef.current = {
                    x: event.clientX - (box.left + box.width / 2),
                    y: event.clientY - (box.top + box.height / 2),
                };
            }}
            onPointerLeave={() => {
                pointerRef.current = undefined;
            }}
        >
            {fieldRef ? fieldEl && createPortal(canvasEl, fieldEl) : canvasEl}
            <a
                ref={linkRef}
                href={href}
                // `cn` here is plain clsx (no tailwind-merge), so the base deliberately sets
                // no width or font size — the caller owns both.
                className={cn(
                    'relative flex items-center gap-2.5 rounded-md bg-dark-accent px-6 py-3.5',
                    'text-[#06251C] no-underline hover:text-[#06251C]',
                    className,
                )}
            >
                {children}
                <ArrowRight size={15} aria-hidden />
            </a>
        </span>
    );
}

/**
 * Band with the big section number. On wide screens the number sits in a left
 * rail beside the content; below `lg` it collapses onto one line above it.
 */
function NumberedBand({
    children,
    flushTop,
    section,
}: {
    children: React.ReactNode;
    // The first band drops its top rule: the tabs bar above it already carries a bottom hairline,
    // so keeping this one would stack into a 2px double line.
    flushTop?: boolean;
    section: (typeof SECTIONS)[number];
}) {
    const { Icon } = section;
    return (
        <div
            id={section.id}
            className={cn(
                'flex w-full scroll-mt-16 flex-col gap-5 pb-11 pt-8 sm:gap-6 sm:pb-20 sm:pt-11 lg:flex-row lg:gap-14',
                GUTTER,
                !flushTop && BAND_RULE,
            )}
        >
            <div className="flex w-full flex-row items-center gap-3 sm:gap-3.5 lg:w-[20vw] lg:flex-col lg:items-start lg:gap-1.5">
                <Icon
                    aria-hidden
                    strokeWidth={1.5}
                    className="size-[35px] shrink-0 text-dark-accent sm:size-10 lg:size-[33px] xxl:size-10"
                />
                <span className={cn(MONO_LABEL, 'text-[#8B9B94]')}>{section.kicker}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-[26px] lg:max-w-[880px] lg:flex-1">{children}</div>
        </div>
    );
}

function BandIntro({ children, title }: { children: React.ReactNode; title: string }) {
    return (
        <div className="flex w-full flex-col gap-3">
            <h2 className="m-0 text-[22px] font-normal leading-6 tracking-[-0.6px] text-[#EDF2F0] sm:text-[25px] sm:leading-[27px] sm:tracking-[-0.7px] lg:text-[28px] lg:leading-[30px] lg:tracking-[-0.8px] xxl:text-[33px] xxl:leading-9 xxl:tracking-[-1px]">
                {title}
            </h2>
            <p className="m-0 max-w-[760px] text-sm leading-[22px] text-[#8B9B94] sm:text-base sm:leading-[26px]">
                {children}
            </p>
        </div>
    );
}

/** True below the `sm` breakpoint (768px), where the mobile-only affordances live. */
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const query = window.matchMedia('(max-width: 767px)');
        const update = () => setIsMobile(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return isMobile;
}

/** Collapsed height of a `collapsible` card on mobile, before the fog. */
const CODE_CARD_COLLAPSED = 168;

/** Sunken snippet card: label (or a custom header such as tabs) bar with a copy affordance, then the code. */
function CodeCard({
    code,
    collapsible,
    header,
    label,
}: {
    code: string;
    collapsible?: boolean;
    header?: React.ReactNode;
    label?: string;
}) {
    const [state, copy] = useCopyToClipboard(1000);
    // Collapse is a mobile-only affordance: below `sm` the long instructions dissolve
    // into fog and hide behind a show-more toggle; from `sm` up the card is always full.
    const [expanded, setExpanded] = useState(false);
    const [fullHeight, setFullHeight] = useState(0);
    const preRef = useRef<HTMLPreElement>(null);
    const isMobile = useIsMobile();

    // Measure the natural height so the max-height clamp can animate to a real value
    // instead of an arbitrary large one (which would collapse with a visible delay).
    useEffect(() => {
        if (!collapsible) return;
        const pre = preRef.current;
        if (!pre) return;
        const measure = () => setFullHeight(pre.scrollHeight);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(pre);
        return () => observer.disconnect();
    }, [collapsible, code]);

    const icon = {
        copied: <Check size={14} aria-hidden />,
        copy: <Copy size={14} aria-hidden />,
        errored: <XCircle size={14} aria-hidden />,
    }[state];

    const clamped = collapsible && isMobile && !expanded;
    const preMaxHeight = collapsible && isMobile ? (expanded ? fullHeight : CODE_CARD_COLLAPSED) : undefined;

    return (
        <div className="w-full overflow-hidden rounded-lg border border-solid border-[#242E2B] bg-[#0D1211]">
            <div
                className={cn(
                    // Tabs stretch to the full header height and carry their own vertical padding
                    // (so the underline lands on the separator); a plain label keeps symmetric py-3.
                    'flex w-full gap-2.5 px-[18px]',
                    header ? 'items-stretch' : 'items-center py-3',
                    'border-0 border-b border-solid border-[#242E2B]',
                )}
            >
                {header ?? (
                    <>
                        <span className={cn(MONO_LABEL, 'text-[#5C6B65]')}>{label}</span>
                        <span className="h-px flex-1" />
                    </>
                )}
                <button
                    type="button"
                    aria-label="Copy to clipboard"
                    onClick={() => copy(code)}
                    className={cn(
                        'flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#5C6B65] hover:text-[#8B9B94]',
                        state === 'copied' && 'text-dark-accent hover:text-dark-accent',
                        state === 'errored' && 'text-red-500 hover:text-red-500',
                    )}
                >
                    {icon}
                </button>
            </div>
            <div className="relative">
                {/* Commands wrap instead of scrolling sideways: a copyable snippet should be
                    readable in full without dragging it, and long endpoint URLs break anywhere. */}
                <pre
                    ref={preRef}
                    style={preMaxHeight === undefined ? undefined : { maxHeight: preMaxHeight }}
                    className={cn(
                        'm-0 whitespace-pre-wrap px-[18px] pb-5 pt-[18px] font-mono text-[12.5px] leading-[23px] text-[#EDF2F0] [overflow-wrap:anywhere]',
                        collapsible && 'overflow-hidden transition-[max-height] duration-500 ease-in-out',
                    )}
                >
                    {code}
                </pre>
                {/* The clamped text is led into fog the colour of the card background. */}
                {clamped && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
                        style={{ backgroundImage: 'linear-gradient(to bottom, #0D121100 0%, #0D1211 92%)' }}
                    />
                )}
            </div>
            {collapsible && (
                <button
                    type="button"
                    onClick={() => setExpanded(value => !value)}
                    className={cn(
                        'flex w-full cursor-pointer items-center justify-center border-0 border-t border-solid border-[#242E2B]',
                        'bg-transparent py-3 font-mono text-[12px] uppercase tracking-[1.3px] text-[#8B9B94] hover:text-[#EDF2F0] sm:hidden',
                    )}
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
}

/** Width (px) of the dissolve at a tab row's scrolling edge. */
const TAB_FADE = 28;

/**
 * Compact tab row for a card header bar — sits where a static label would, scrolls if it overflows.
 *
 * An overflowing row dissolves at the ends that have tabs scrolled out of sight rather than being
 * chopped off mid-letter: on the right that edge butts against the copy button, where a hard cut
 * read as a rendering fault. The fade follows the scroll position, so a row scrolled to its end
 * shows the last tab at full strength and one that fits is not faded at all.
 */
function CardTabs({
    items,
    onChange,
    value,
}: {
    items: { id: string; label: string }[];
    onChange: (id: string) => void;
    value: string;
}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ end: false, start: false });

    useEffect(() => {
        const row = rowRef.current;
        if (!row) return;
        const update = () => {
            // 1px of slack: fractional scroll offsets never land exactly on the maximum.
            const max = row.scrollWidth - row.clientWidth;
            const start = row.scrollLeft > 1;
            const end = row.scrollLeft < max - 1;
            setEdges(prev => (prev.start === start && prev.end === end ? prev : { end, start }));
        };
        update();
        row.addEventListener('scroll', update, { passive: true });
        const observer = new ResizeObserver(update);
        observer.observe(row);
        return () => {
            row.removeEventListener('scroll', update);
            observer.disconnect();
        };
    }, [items]);

    // Opaque across the row, transparent only at an edge with more tabs behind it.
    const stops = [
        edges.start ? `transparent, #000 ${TAB_FADE}px` : '#000',
        edges.end ? `#000 calc(100% - ${TAB_FADE}px), transparent` : '#000',
    ].join(', ');
    const mask = edges.start || edges.end ? `linear-gradient(to right, ${stops})` : undefined;

    return (
        <div
            ref={rowRef}
            role="tablist"
            className="flex min-w-0 flex-1 items-stretch gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitMaskImage: mask, maskImage: mask }}
        >
            {items.map(item => {
                const active = item.id === value;
                return (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(item.id)}
                        className={cn(
                            // pt-3 over the text and pb-[10px]+2px border underneath sum to 12px, so
                            // the text is centred and the underline sits on the separator without the
                            // 2px adding to the header height (it matches the plain-label header).
                            'flex shrink-0 cursor-pointer items-center whitespace-nowrap border-0 border-b-2 border-solid bg-transparent px-0 pb-[10px] pt-3 font-mono text-[12px] uppercase tracking-[1.3px] transition-colors',
                            active
                                ? 'border-dark-accent text-dark-accent'
                                : 'border-transparent text-[#5C6B65] hover:text-[#8B9B94]',
                        )}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

function Setup({ origin }: { origin: string }) {
    const [client, setClient] = useState(SETUP_CLIENTS[0].id);
    const active = SETUP_CLIENTS.find(candidate => candidate.id === client) ?? SETUP_CLIENTS[0];

    return (
        <>
            <BandIntro title="Pick your client, paste one line">
                Pick your tool, copy the config — snippets already point at this deployment. No API key needed.
            </BandIntro>
            <CodeCard
                code={active.snippet(origin)}
                header={<CardTabs items={SETUP_CLIENTS} onChange={setClient} value={client} />}
            />
            <p className="m-0 flex w-full items-start gap-[9px] text-sm leading-[21px] text-[#8B9B94]">
                <Check size={14} aria-hidden className="mt-[3px] shrink-0 text-dark-accent" />
                {active.verify}
            </p>
        </>
    );
}

function Instructions() {
    return (
        <>
            <BandIntro title="Teach it to reach for the Explorer">
                Teach the agent to reach for the Explorer instead of guessing — add the block below to the instructions
                file your tool reads.
            </BandIntro>
            <CodeCard code={AGENT_INSTRUCTIONS_SNIPPET} label="Agent instructions" collapsible />
            <p className="m-0 text-sm leading-[21px] text-[#8B9B94]">
                Drop the snippet above into whichever of these your tool reads:
                <span className="mt-1 block font-mono text-[13px] text-[#EDF2F0] [overflow-wrap:anywhere]">
                    {AGENT_INSTRUCTIONS_TARGETS.map(({ file }) => file).join(' · ')}
                </span>
            </p>
        </>
    );
}

const TOOL_VIEWS = [
    { id: 'request', label: 'Request' },
    { id: 'response', label: 'Response' },
];

function Tools() {
    return (
        <>
            <BandIntro title="Two tools cover the whole chain">
                The server registers two tools. Both are read-only — nothing signs, sends or mutates.
            </BandIntro>
            <ToolDoc
                name="inspect_entity"
                description="Retrieves detailed on-chain data for any Solana address or transaction signature. The tool detects which one it was given."
                request={
                    <>
                        <ToolParam name="identifier" requirement="required">
                            A base58 string, 1–128 characters: a 32-byte account address or a 64-byte transaction
                            signature.
                        </ToolParam>
                        <ToolParam name="cluster" requirement="optional">
                            One of mainnet-beta, devnet, testnet, simd296. Defaults to mainnet-beta.
                        </ToolParam>
                    </>
                }
                response={
                    <pre className="m-0 whitespace-pre-wrap px-[18px] pb-5 pt-[18px] font-mono text-[12.5px] leading-[23px] text-[#EDF2F0] [overflow-wrap:anywhere]">
                        {INSPECT_ENTITY_RESPONSE}
                    </pre>
                }
                note={
                    <p className="m-0 max-w-[820px] text-sm leading-[22px] text-[#8B9B94]">
                        Accounts owned by the legacy loaders are not supported yet and answer with a{' '}
                        <span className="font-mono text-[13px] text-[#EDF2F0]">CURRENTLY_UNSUPPORTED</span> error.
                        Fields that cannot be resolved come back as explicit unknown markers rather than being dropped.
                    </p>
                }
            />
            <ToolDoc
                name="ping"
                description="Basic health tool. Takes no arguments and answers pong. Ask the agent to call it to verify the connection end-to-end."
                request={<ToolParam name="{}">No parameters — the probe takes an empty argument object.</ToolParam>}
                response={
                    <ToolParam name="pong">
                        Answers <span className="font-mono text-[13px] text-[#EDF2F0]">pong</span>. Ask the agent to
                        call it to verify the connection end-to-end.
                    </ToolParam>
                }
            />
        </>
    );
}

function ToolDoc({
    description,
    name,
    note,
    request,
    response,
}: {
    description: string;
    name: string;
    note?: React.ReactNode;
    request: React.ReactNode;
    response: React.ReactNode;
}) {
    const [view, setView] = useState(TOOL_VIEWS[0].id);

    return (
        <div className="flex w-full flex-col gap-3 pt-[22px]">
            <div className="flex w-fit items-center gap-3">
                <span className="font-mono text-base text-[#EDF2F0]">{name}</span>
                <span className="rounded-md bg-[#0D3D31] px-[7px] py-0.5 font-mono text-[10px] tracking-[0.6px] text-dark-accent">
                    read-only
                </span>
            </div>
            <p className="m-0 max-w-[820px] text-[15.5px] leading-[25px] text-[#8B9B94]">{description}</p>
            {/* The whole panel body is given to the active view — the response fills it like the
                snippet fills the setup card; any commentary lives below the panel, not inside it. */}
            <div className="mt-2 w-full overflow-hidden rounded-lg border border-solid border-[#242E2B] bg-[#0D1211]">
                <div className="flex w-full items-stretch gap-2.5 border-0 border-b border-solid border-[#242E2B] px-[18px]">
                    <CardTabs items={TOOL_VIEWS} onChange={setView} value={view} />
                </div>
                <div className="w-full">{view === 'request' ? request : response}</div>
            </div>
            {note}
        </div>
    );
}

function ToolParam({
    children,
    name,
    requirement,
}: {
    children: React.ReactNode;
    name: string;
    requirement?: 'required' | 'optional';
}) {
    return (
        <div
            className={cn(
                'flex w-full flex-col gap-2 px-[18px] py-3.5 lg:flex-row lg:items-baseline lg:gap-6',
                'border-0 border-t border-solid border-[#242E2B] first:border-t-0',
            )}
        >
            <div className="flex w-full items-baseline gap-2.5 lg:w-[220px] lg:shrink-0">
                <span className="font-mono text-[13px] text-[#EDF2F0]">{name}</span>
                {requirement && (
                    <span className={cn('text-xs', requirement === 'required' ? 'text-dark-accent' : 'text-[#5C6B65]')}>
                        {requirement}
                    </span>
                )}
            </div>
            <p className="m-0 text-[14.5px] leading-[22px] text-[#8B9B94] lg:flex-1">{children}</p>
        </div>
    );
}

function Examples() {
    const [picked, setPicked] = useState<McpExample | undefined>(undefined);
    const boxRef = useRef<HTMLDivElement>(null);
    // Set on "ask other question": the chat's bottom edge before the box shrinks back to
    // the picker, so we can scroll it back to the same spot afterwards.
    const pendingBottom = useRef<number | undefined>(undefined);

    const handleReset = () => {
        pendingBottom.current = boxRef.current?.getBoundingClientRect().bottom;
        setPicked(undefined);
    };

    // After the box has shrunk back to the picker: on mobile, lift its top edge to just under the
    // top of the screen (CHAT_TOP_GAP) so the whole picker comes into view; on larger screens, hold
    // its bottom edge where the answer had left it.
    useLayoutEffect(() => {
        if (picked !== undefined) return;
        const target = pendingBottom.current;
        pendingBottom.current = undefined;
        const box = boxRef.current;
        if (target === undefined || !box) return;
        if (window.matchMedia('(max-width: 767px)').matches) {
            const delta = box.getBoundingClientRect().top - CHAT_TOP_GAP;
            if (delta !== 0) window.scrollBy({ behavior: 'smooth', top: delta });
            return;
        }
        const delta = box.getBoundingClientRect().bottom - target;
        if (delta !== 0) window.scrollBy(0, delta);
    }, [picked]);

    return (
        <>
            <div
                ref={boxRef}
                className="w-full overflow-hidden rounded-xl border border-solid border-[#242E2B] bg-[#121716] shadow-[0px_14px_36px_-12px_#00000073]"
            >
                <div className="flex w-full items-center gap-2.5 border-0 border-b border-solid border-[#242E2B] px-3.5 py-3 sm:px-[18px] sm:py-[13px]">
                    <span className={cn(MONO_LABEL, 'text-[#5C6B65]')}>MCP examples</span>
                    <span className="h-px flex-1" />
                    <span className="font-mono text-[10px] tracking-[0.5px] text-[#5C6B65]">
                        mainnet-beta · read-only
                    </span>
                </div>
                {picked === undefined ? (
                    <ExamplePicker onPick={setPicked} />
                ) : (
                    <ExampleAnswer key={picked.id} boxRef={boxRef} example={picked} onReset={handleReset} />
                )}
            </div>
        </>
    );
}

/** Opening state: the greeting plus the four suggestions, 2 × 2 from `sm` up. */
function ExamplePicker({ onPick }: { onPick: (example: McpExample) => void }) {
    return (
        // Matches the answer's min height so the box doesn't resize between states.
        <div className="flex min-h-[440px] w-full flex-col items-center p-4 sm:px-[26px] sm:py-6">
            {/* The greeting is centred in the flexible space above the buttons, so the room over and
                under it is equal; the buttons stay anchored to the bottom. */}
            <div className="flex w-full flex-1 items-center justify-center">
                <p className="m-0 max-w-[600px] py-7 text-center text-[16.5px] leading-[26px] text-[#EDF2F0] sm:py-0 sm:text-[18px] sm:leading-[28px]">
                    I can read any account, program, token mint or transaction on mainnet-beta — decoded, not raw. Pick
                    a question to start.
                </p>
            </div>
            <div className="flex w-full max-w-[600px] flex-col gap-6">
                <span className={cn(MONO_LABEL, 'text-center text-[#8B9B94]')}>Try it</span>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                    {MCP_EXAMPLES.map(example => (
                        <button
                            key={example.id}
                            type="button"
                            onClick={() => onPick(example)}
                            className={cn(
                                'flex cursor-pointer items-center rounded-[12px_12px_4px_12px] border border-solid px-4 py-3 text-left text-sm leading-[22px]',
                                'border-[#242E2B] bg-transparent text-[#8B9B94] transition-colors',
                                // The design draws one option in the accent state; here that state is
                                // where the pointer (or keyboard focus) actually is.
                                'hover:border-dark-accent hover:bg-[#0D3D31] hover:text-dark-accent',
                                'focus-visible:border-dark-accent focus-visible:bg-[#0D3D31] focus-visible:text-dark-accent',
                                'sm:min-h-[90px]',
                            )}
                        >
                            {example.prompt}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// The reply plays back the way a real agent answers: the question lands, the model
// thinks for a beat, then the answer types itself out.
const SENDING_MS = 320;
const THINKING_MS = 317;
/** Characters per second while typing — fast enough to skim, slow enough to read along. */
const TYPING_SPEED = 260;

/** Gap held between the chat box's bottom edge and the viewport bottom while it docks. */
const CHAT_BOTTOM_GAP = 16;
/** Mobile only: gap left above the chat box's top edge after returning to the picker. */
const CHAT_TOP_GAP = 20;
/** Per-second easing rate for the type-along scroll follow (higher = snaps to the bottom sooner). */
const CHAT_FOLLOW_RATE = 12;

type ChatPhase = 'sending' | 'thinking' | 'typing' | 'done';

/** Answered state: the question lands, the agent thinks, then types its reply. */
function ExampleAnswer({
    boxRef,
    example,
    onReset,
}: {
    boxRef: React.RefObject<HTMLDivElement | null>;
    example: McpExample;
    onReset: () => void;
}) {
    const reduced = useReducedMotion();
    const [phase, setPhase] = useState<ChatPhase>('sending');
    const [revealed, setRevealed] = useState(0);
    // Flips true the moment the reader scrolls of their own accord; from then on we never
    // auto-scroll again for this answer — a manual scroll always wins over the type-along follow.
    const userScrolled = useRef(false);

    const total = useMemo(() => answerCost(example.answer), [example.answer]);

    // wheel / touch-drag / scroll-keys are user-intent signals that a programmatic scrollBy never
    // emits, so they cleanly tell "the reader took over" apart from our own follow scrolling.
    useEffect(() => {
        const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);
        const interrupt = () => {
            userScrolled.current = true;
        };
        const onKey = (event: KeyboardEvent) => {
            if (SCROLL_KEYS.has(event.key)) userScrolled.current = true;
        };
        window.addEventListener('wheel', interrupt, { passive: true });
        window.addEventListener('touchmove', interrupt, { passive: true });
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('wheel', interrupt);
            window.removeEventListener('touchmove', interrupt);
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    // When the answer finishes, bring the "ask other question" button into view — the footer
    // appears below the reply and can land just past the bottom of the screen.
    useEffect(() => {
        if (phase !== 'done') return;
        const box = boxRef.current;
        if (!box || userScrolled.current) return;
        const delta = box.getBoundingClientRect().bottom - (window.innerHeight - CHAT_BOTTOM_GAP);
        if (delta > 0) window.scrollBy({ behavior: reduced ? 'auto' : 'smooth', top: delta });
    }, [phase, reduced, boxRef]);

    // While the reply types, ease the page down so the growing bubble's bottom holds
    // ~CHAT_BOTTOM_GAP above the viewport bottom. The answer grows in discrete line/row steps, so
    // snapping to the exact bottom each frame jumps; instead a self-driven rAF eases the scroll by a
    // frame-rate-independent fraction of the remaining distance, blending those steps into one glide.
    useEffect(() => {
        if (phase !== 'typing') return;
        let frame = 0;
        let last = 0;
        const follow = (now: number) => {
            // Once the reader scrolls themselves, bow out — stop the loop and leave the page alone.
            if (userScrolled.current) return;
            const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20);
            last = now;
            const box = boxRef.current;
            if (box) {
                const delta = box.getBoundingClientRect().bottom - (window.innerHeight - CHAT_BOTTOM_GAP);
                if (delta > 0.5) window.scrollBy(0, delta * (1 - Math.exp(-dt * CHAT_FOLLOW_RATE)));
            }
            frame = requestAnimationFrame(follow);
        };
        frame = requestAnimationFrame(follow);
        return () => cancelAnimationFrame(frame);
    }, [phase, boxRef]);

    // Reduced motion gets the finished answer, no playback.
    useEffect(() => {
        if (reduced) {
            setPhase('done');
            return;
        }
        const toThinking = setTimeout(() => setPhase('thinking'), SENDING_MS);
        const toTyping = setTimeout(() => setPhase('typing'), SENDING_MS + THINKING_MS);
        return () => {
            clearTimeout(toThinking);
            clearTimeout(toTyping);
        };
    }, [reduced]);

    useEffect(() => {
        if (phase === 'done') {
            setRevealed(total);
            return;
        }
        if (phase !== 'typing') return;

        let frame = 0;
        let startedAt = 0;
        const step = (now: number) => {
            startedAt ||= now;
            const next = Math.min(total, ((now - startedAt) / 1000) * TYPING_SPEED);
            setRevealed(next);
            if (next < total) {
                frame = requestAnimationFrame(step);
            } else {
                setPhase('done');
            }
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [phase, total]);

    const blocks = phase === 'done' ? revealAnswer(example.answer, total) : revealAnswer(example.answer, revealed);
    const answering = phase === 'typing' || phase === 'done';

    return (
        // A 440px floor on every width; `mt-auto` keeps the message pinned to the bottom, so
        // it lands low, slides up as the reply types, and only then grows the box past 440.
        <div className="flex min-h-[440px] w-full flex-col">
            <div className="mt-auto flex w-full flex-col gap-3.5 p-4 sm:p-[26px]">
                <div className="flex w-full justify-end">
                    <div
                        className={cn(
                            'max-w-[600px] rounded-[12px_12px_4px_12px] bg-[#0D3D31] px-4 py-3 text-sm leading-[22px] text-[#EDF2F0] [overflow-wrap:anywhere]',
                            !reduced && 'duration-300 animate-in fade-in slide-in-from-bottom-2',
                        )}
                    >
                        {example.question}
                    </div>
                </div>

                {phase === 'thinking' && <ThinkingBubble />}

                {answering && (
                    <>
                        <div
                            className={cn(
                                'flex w-fit items-center gap-2 font-mono text-[11px] text-[#5C6B65]',
                                !reduced && 'duration-300 animate-in fade-in',
                            )}
                        >
                            <Link2 size={12} aria-hidden />
                            Ran {example.tool} · Explorer MCP
                        </div>
                        <div
                            // `aria-live` so the reply is announced once it settles rather than per frame.
                            aria-live="polite"
                            aria-busy={phase === 'typing'}
                            className="flex w-full max-w-[800px] flex-col gap-3.5 rounded-[12px_12px_12px_4px] border border-solid border-[#242E2B] bg-[#0D1211] p-3.5 sm:px-[18px] sm:py-4"
                        >
                            {blocks.map((revealedBlock, index) => (
                                <AnswerBlockView
                                    key={index}
                                    revealed={revealedBlock}
                                    caret={phase === 'typing' && index === blocks.length - 1}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {phase === 'done' && (
                <div
                    className={cn(
                        'flex w-full items-center justify-center border-0 border-t border-solid border-[#242E2B] px-[18px] py-3.5',
                        !reduced && 'duration-300 animate-in fade-in',
                    )}
                >
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex cursor-pointer items-center gap-[9px] rounded-md border border-solid border-[#242E2B] bg-[#0D1211] px-[18px] py-2.5 text-[13.5px] text-[#8B9B94] hover:text-[#EDF2F0]"
                    >
                        <RotateCcw size={13} aria-hidden />
                        Ask other question
                    </button>
                </div>
            )}
        </div>
    );
}

/** The beat before the answer: three dots in an empty agent bubble. */
function ThinkingBubble() {
    return (
        <div className="flex w-fit items-center gap-1.5 rounded-[12px_12px_12px_4px] border border-solid border-[#242E2B] bg-[#0D1211] px-4 py-3.5">
            <span className="sr-only">Thinking…</span>
            {[0, 140, 280].map(delay => (
                <span
                    key={delay}
                    aria-hidden
                    className="size-1.5 animate-bounce rounded-full bg-[#5C6B65]"
                    style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
                />
            ))}
        </div>
    );
}

function AnswerBlockView({ caret, revealed }: { caret: boolean; revealed: RevealedBlock }) {
    const { block } = revealed;

    if (block.kind === 'text') {
        return (
            <p className="m-0 text-sm leading-[23px] text-[#EDF2F0] [overflow-wrap:anywhere]">
                {revealed.text}
                {caret && <TypingCaret />}
            </p>
        );
    }

    const rows = block.rows.slice(0, revealed.rows);

    return (
        <div className="w-full overflow-hidden rounded-lg border border-solid border-[#242E2B]">
            <table className="w-full table-auto border-collapse">
                <thead>
                    <tr className="bg-[#121716]">
                        {block.head.map((title, index) => (
                            <th
                                key={title}
                                className={cn(
                                    'border-0 border-r border-solid border-[#242E2B] last:border-r-0',
                                    // The rule under the head only makes sense once a body row is there.
                                    rows.length > 0 && 'border-b',
                                    'px-3 py-2.5 text-left font-mono text-[11.5px] font-normal uppercase leading-[16px] tracking-[1px] text-[#5C6B65]',
                                    // The key column stays on one line; only the value columns wrap.
                                    index === 0 && 'whitespace-nowrap',
                                )}
                            >
                                {title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        // The rule between body rows lives on the row, so the last one closes flush
                        // against the wrapper's rounded border.
                        <tr key={row[0]} className="border-0 border-b border-solid border-[#242E2B] last:border-b-0">
                            {row.map((cell, index) => (
                                <td
                                    key={cell}
                                    className={cn(
                                        'border-0 border-r border-solid border-[#242E2B] last:border-r-0',
                                        'px-3 py-2.5 align-top text-[13px] leading-5 text-[#EDF2F0] [overflow-wrap:anywhere]',
                                        // The key column stays on one line; only the value columns wrap.
                                        index === 0 && 'whitespace-nowrap',
                                    )}
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

function TypingCaret() {
    return (
        <span
            aria-hidden
            className="ml-0.5 inline-block h-[13px] w-[7px] translate-y-[1px] animate-pulse bg-dark-accent"
        />
    );
}

function ClosingCta() {
    // Like the hero, the gravity field spans this whole band so the dots drift in across
    // the full gradient rather than just around the button.
    const fieldRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={fieldRef}
            className={cn(
                'relative w-full overflow-hidden bg-[#121716] pb-[60px] pt-14 sm:pb-20 sm:pt-[76px]',
                GUTTER,
                BAND_RULE,
            )}
            style={{
                backgroundImage: 'radial-gradient(ellipse 60% 85% at 50% 100%, #1DD79B33 0%, #12171600 100%)',
                backgroundRepeat: 'no-repeat',
            }}
        >
            {/* Content sits above the portaled gravity canvas (which is z-0 in this band). */}
            <div className="relative z-[1] mx-auto flex w-full max-w-[720px] flex-col items-center gap-[18px]">
                <span className="font-mono text-[12px] uppercase tracking-[1.6px] text-dark-accent">Start now</span>
                <h2 className="m-0 max-w-[800px] text-center text-[26px] font-normal leading-[29px] tracking-[-0.8px] text-[#EDF2F0] sm:text-[44px] sm:leading-[48px] sm:tracking-[-1.6px]">
                    Give your agent the chain, read-only
                </h2>
                <p className="m-0 max-w-[620px] text-center text-base leading-[26px] text-[#8B9B94]">
                    One command, no key, nothing that can sign. Works with Claude Code, Cursor, Windsurf, Codex and VS
                    Code.
                </p>
                <div className="flex flex-col items-center gap-2.5 pt-2.5 sm:flex-row sm:gap-3">
                    <GravityCta
                        href="#setup"
                        fieldRef={fieldRef}
                        className="text-[15.5px]"
                        dotScale={1 / 1.5}
                        falloff={1.6}
                        flightSpeedScale={0.53}
                        mobileDotScale={0.5}
                        mobilePullScale={0.5}
                        pageBottomGap={0}
                        softening={52}
                    >
                        Set up your agent
                    </GravityCta>
                </div>
            </div>
        </div>
    );
}
