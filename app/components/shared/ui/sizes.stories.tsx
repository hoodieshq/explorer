import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { Switch } from '@/app/components/shared/ui/switch';
import { PageHeader } from '@/app/shared/ui/page-header/PageHeader';
import {
    DSCOMMON_AFTER_HEADER,
    DSCOMMON_BEFORE_HEADER,
    DSCOMMON_BETWEEN_BLOCKS,
    DSCOMMON_MAX_WIDTHS,
    DSCOMMON_PAGE_PADDING_X,
    DSCOMMON_SPACINGS,
    type Spacing,
    type Tier,
    TIER_LABEL,
    TIER_ORDER,
    tierRange,
} from '@/app/shared/ui/page-spacing/spacing';

// Design-system size tokens for a detail page (Transaction / Block / Account): the content column
// max-width and the vertical/horizontal spacing rhythm. REFERENCE — the coloured bands in the example
// below make the spacings visible. The tokens live in `@/app/shared/ui/page-spacing/spacing` and are
// applied by the real pages.
const SPACINGS = DSCOMMON_SPACINGS;

// A band whose height IS the documented gap. When `show`, it's tinted with dashed guide lines and the
// name + value to the right; when off, it collapses to an invisible spacer of the same height, so the
// real gap stays but the guides disappear.
function Band({ label, value, h, show }: { label: string; value: string; h: string; show: boolean }) {
    if (!show) return <div aria-hidden className={h} />;
    return (
        <div className={`border-accent/50 bg-accent/10 relative border-y border-dashed ${h}`}>
            <span className="absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap text-[11px] text-white">
                {label} <span className="ml-1 font-mono text-accent">{value}</span>
            </span>
        </div>
    );
}

// A stand-in content block, matched to the detail-page card surface.
function Block({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 px-4 py-6 text-sm text-white">
            {children}
        </div>
    );
}

// One example page for a tier — real PageHeader, real card surfaces, gaps drawn as labelled bands sized
// to that tier's values.
function ExampleColumn({ tier, width, showGuides }: { tier: Tier; width: string; showGuides: boolean }) {
    const pad = DSCOMMON_PAGE_PADDING_X.values[tier].px === '24px' ? 'px-6' : 'px-4';
    const band = (s: Spacing) => {
        const v = s.values[tier];
        return <Band h={v.band ?? ''} label={s.label} show={showGuides} value={v.px} />;
    };
    return (
        <div>
            <div className="mb-3 text-sm font-medium text-white">
                {TIER_LABEL[tier]} <span className="font-mono text-outer-space-300">· {tierRange(tier)}</span>
            </div>
            <div className={width}>
                <div className={`flex flex-col rounded-lg border border-dashed border-neutral-700 ${pad}`}>
                    {band(DSCOMMON_BEFORE_HEADER)}
                    <PageHeader title="Page title" />
                    {band(DSCOMMON_AFTER_HEADER)}
                    <Block>First block</Block>
                    {band(DSCOMMON_BETWEEN_BLOCKS)}
                    <Block>Second block</Block>
                </div>
            </div>
        </div>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h2 className="m-0 mb-3 text-xs font-medium uppercase tracking-wide text-outer-space-300">{children}</h2>;
}

// Max-width tokens: variable name, what it caps, its value, and the applied Tailwind class.
function MaxWidths() {
    return (
        <div className="overflow-x-auto rounded-lg border border-solid border-outer-space-800">
            <table className="w-full border-collapse text-sm text-white">
                <thead>
                    <tr className="text-left text-xs uppercase text-outer-space-300">
                        <th className="px-3 py-2 font-normal">Variable</th>
                        <th className="px-3 py-2 font-normal">Size</th>
                        <th className="px-3 py-2 font-normal">Value</th>
                        <th className="px-3 py-2 font-normal">Class</th>
                    </tr>
                </thead>
                <tbody>
                    {DSCOMMON_MAX_WIDTHS.map(w => (
                        <tr key={w.name} className="border-t border-solid border-outer-space-800">
                            <td className="px-3 py-2 font-mono text-accent">{w.name}</td>
                            <td className="px-3 py-2">{w.label}</td>
                            <td className="px-3 py-2 font-mono">{w.value}</td>
                            <td className="px-3 py-2 font-mono text-outer-space-300">{w.className}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Each tier column shows the value AND the Tailwind class that produces it at that tier (the class is
// tier-specific — e.g. `px-4` on mobile vs `lg:px-6` from lg on).
function Legend() {
    return (
        <div className="overflow-x-auto rounded-lg border border-solid border-outer-space-800">
            <table className="w-full border-collapse text-sm text-white">
                <thead>
                    <tr className="text-left text-xs uppercase text-outer-space-300">
                        <th className="px-3 py-2 font-normal">Variable</th>
                        <th className="px-3 py-2 font-normal">Spacing</th>
                        {TIER_ORDER.map(t => (
                            <th key={t} className="px-3 py-2 font-normal">
                                {TIER_LABEL[t]} ({tierRange(t)})
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {SPACINGS.map(s => (
                        <tr key={s.name} className="border-t border-solid border-outer-space-800 align-top">
                            <td className="px-3 py-2 font-mono text-accent">{s.name}</td>
                            <td className="px-3 py-2">{s.label}</td>
                            {TIER_ORDER.map(t => (
                                <td key={t} className="px-3 py-2 font-mono">
                                    <div>{s.values[t].px}</div>
                                    <div className="text-xs text-outer-space-300">{s.values[t].cls}</div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SizesView() {
    // Toggle the guide lines (tinted bands + labels) on/off; the real gaps stay either way.
    const [showGuides, setShowGuides] = React.useState(true);
    const widths = ['w-[320px]', 'w-[460px] max-w-full', 'w-[560px] max-w-full'];
    return (
        <div className="min-h-screen bg-heavy-metal-900 py-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4">
                <section>
                    <SectionHeading>Max widths</SectionHeading>
                    <MaxWidths />
                </section>
                <section>
                    <SectionHeading>Page spacings</SectionHeading>
                    <Legend />
                </section>
            </div>

            {/* Solid, edge-to-edge divider between the token tables and the live example page. */}
            <div className="my-8 border-0 border-t border-solid border-neutral-600" />

            <div className="mx-auto w-full max-w-5xl overflow-x-auto px-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-outer-space-300">
                    Example page — one column per tier
                </div>
                <div className="mb-6 flex items-center gap-3">
                    <Switch aria-label="Show spacing guides" checked={showGuides} onCheckedChange={setShowGuides} />
                    <span className="select-none text-sm text-white">Show spacing guides</span>
                </div>
                <div className="flex flex-col gap-12">
                    {TIER_ORDER.map((tier, i) => (
                        <ExampleColumn key={tier} tier={tier} width={widths[i] ?? 'w-full'} showGuides={showGuides} />
                    ))}
                </div>
            </div>
        </div>
    );
}

const meta = {
    component: SizesView,
    parameters: {
        docs: {
            description: {
                component: [
                    'Design-system size tokens for a detail page (Transaction / Block / Account): the content',
                    'column max-width and the vertical/horizontal spacing rhythm. Each is its own `DSCOMMON_*`',
                    'variable; the spacing values are per-tier and the tier boundaries (`TIER_BREAKPOINTS`) are a',
                    'per-page variable. Tokens live in `@/app/shared/ui/page-spacing/spacing`.',
                    '',
                    '## References',
                    '',
                    '- [PageHeader](?path=/docs/components-shared-pageheader--docs) — the "Details / <title>" page header rendered at the top of each example column.',
                    '- [Card](?path=/docs/components-shared-card-basecard--docs) — the detail-page block surface; the example blocks stand in for it.',
                    '- [Switch](?path=/docs/components-shared-switch--docs) — toggles the spacing guide lines on the example page.',
                ].join('\n'),
            },
        },
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    title: 'Design System/Sizes',
} satisfies Meta<typeof SizesView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Reference: Story = {
    render: () => <SizesView />,
};
