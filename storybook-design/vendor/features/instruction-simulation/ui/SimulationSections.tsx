import { cn } from '@components/shared/utils';
import { useCluster } from '@providers/cluster';
import type { VersionedMessage } from '@solana/web3.js';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';
import { Card, CardBody } from '@/app/shared/ui/Card';

import { ProgramLogsCardBody } from '../../../components/ProgramLogsCardBody';
import { DENSE_ROW_PADDING } from '../../../shared/ui/Table/dense-row-padding';
import { LastSimulatedAt } from './LastSimulatedAt';
import { SimulatorCUProfilingCard } from './SimulatorCUProfilingCard';
import { SolBalanceChangesCard } from './SolBalanceChangesCard';

// A block's title paired with a "Simulated" tag — every result block (Logs / CU profiling /
// SOL Balance Changes) is derived from a simulation run, so each carries the badge after its name.
// Badge has no outlined variant, so the outline look is applied inline: an uncoloured dashkit badge
// base (no variant → no fill) plus an accent border + accent text, at a small fixed font size.
function SimulatedTitle({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {children}
            <Badge ui="dashkit" className="border-accent/50 border border-solid !text-[10px] text-accent">
                Simulated
            </Badge>
        </span>
    );
}

// White-noise surface behind the simulation zone: every pixel is a random blend between the app's
// standard background (#141816) and a constant "tint" colour, with sparse brighter "sparkle" specks
// on top. An SVG `feTurbulence` generates fine grain, `feColorMatrix` recolours it to the constant
// colour with a noisy alpha (alpha = luminance of the turbulence), and it's layered over the base — so
// the alpha noise fades each pixel between the two colours. Only the padding/gaps show it; the cards
// keep their own surface. Colours are fractional sRGB triples [r, g, b]. Exposed as a factory so a
// variant can reuse the exact same grain at a different hue (see the Match-to-TX-view failure zone,
// which is luminance-matched to this green so only the hue differs).
type Rgb = [number, number, number];

function noiseLayer({
    id,
    baseFrequency,
    numOctaves,
    seed,
    color: [r, g, b],
    alphaRow,
}: {
    id: string;
    baseFrequency: string;
    numOctaves: string;
    seed?: string;
    color: Rgb;
    alphaRow: string;
}): string {
    const seedAttr = seed === undefined ? '' : ` seed='${seed}'`;
    // color-interpolation-filters='sRGB': without it SVG filters composite in linearRGB, which lightens
    // midtones and pushes the blend brighter than the tint endpoint. sRGB keeps the range exactly
    // between the base and the tint colour. feColorMatrix rows 1-3 set the constant colour; row 4
    // derives the alpha from the turbulence luminance.
    return (
        `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
        `<filter id='${id}' color-interpolation-filters='sRGB'>` +
        `<feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${numOctaves}'${seedAttr} stitchTiles='stitch'/>` +
        `<feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${alphaRow}'/>` +
        `</filter>` +
        `<rect width='100%' height='100%' filter='url(#${id})'/>` +
        `</svg>`
    );
}

export function buildSimZoneStyle({
    base,
    tint,
    sparkle,
}: {
    base: string;
    tint: Rgb;
    sparkle: Rgb;
}): React.CSSProperties {
    // Base noise: mean alpha ~0.5 so most pixels sit between the base and the tint.
    const noise = noiseLayer({
        alphaRow: '0.5 0.5 0.5 0 -0.25',
        baseFrequency: '0.9',
        color: tint,
        id: 'n',
        numOctaves: '3',
    });
    // Sparkle: a sparser, higher-frequency layer; the alpha threshold (`0.9·sum − 1.75`) only lets the
    // highest turbulence values through, so just a few pixels light up and the rest reveal the noise
    // below. Offset -1.75 vs -1.55 makes visible specks ~20× rarer.
    const sparkleLayer = noiseLayer({
        alphaRow: '0.9 0.9 0.9 0 -1.75',
        baseFrequency: '1.1',
        color: sparkle,
        id: 's',
        numOctaves: '2',
        seed: '11',
    });
    return {
        backgroundColor: base,
        // Sparkle layer first (topmost), then the base noise beneath it.
        backgroundImage:
            `url("data:image/svg+xml,${encodeURIComponent(sparkleLayer)}"), ` +
            `url("data:image/svg+xml,${encodeURIComponent(noise)}")`,
    };
}

// The zone green: base #141816 blended toward the tint green #14261e, with accent-green (#1dd79b)
// sparkles.
export const SIM_ZONE_STYLE: React.CSSProperties = buildSimZoneStyle({
    base: '#141816',
    sparkle: [0.114, 0.843, 0.608],
    tint: [0.078, 0.149, 0.118],
});

// Enhancements-only breakdown of the simulation. Where the shared SimulatorCard packs everything
// under one "Simulation" section, here each block is its own top-level section so it can be a tab
// target: "Simulation" (heading + guidance + the Simulate button + status), then "Logs",
// "CU profiling" and "SOL Balance Changes" once a simulation has resolved. Each section is wrapped
// in an anchor div (`id` = its tab path, `scrollMarginTop` via anchorStyle) for tab navigation.
// The simulation state is owned by the caller (LoadedView) so the tab bar can gate the
// simulation-derived tabs until `status === 'done'`.
export function SimulationSections({
    simulation,
    message,
    showTokenBalanceChanges: _showTokenBalanceChanges,
    anchorStyle,
}: {
    simulation: SimulationState;
    message: VersionedMessage;
    showTokenBalanceChanges: boolean;
    anchorStyle?: React.CSSProperties;
}) {
    const { cluster, url } = useCluster();

    const result = simulation.status === 'done' ? simulation.result : undefined;
    const logs = result?.logs;
    const hasLogs = !!logs?.length;
    const succeeded = !!result && !result.error;
    const isSimulating = simulation.status === 'simulating';
    // `simulate` is present on every state except `simulating`.
    const simulate = 'simulate' in simulation ? simulation.simulate : undefined;

    return (
        // Full-bleed green band: breaks out to the full viewport width (mirrors LoadedView's
        // StickyHeader trick) and re-centres its content on the 960px page column. `overflow-x-clip`
        // guards against the 100vw width provoking a horizontal scrollbar. `-mt-8` cancels the
        // StickyHeader's own `mb-8` so the band starts flush under the tab bar (no gap). The bottom
        // border mirrors the tab bar's own divider so the zone is closed off with the same line.
        <div
            style={SIM_ZONE_STYLE}
            className={cn(
                '-mt-8 ml-[calc(50%-50vw)] w-screen overflow-x-clip py-9 lg:py-12',
                'border-0 border-b border-solid border-neutral-800',
            )}
        >
            <div className="mx-auto flex w-full max-w-[960px] flex-col gap-9 px-3 lg:gap-12">
                <section id="simulation" style={anchorStyle} aria-label="Simulation" className="flex flex-col gap-3">
                    <h2 className="m-0 text-lg font-normal text-white">Simulation</h2>
                    {/* Guidance stays between the heading and the button at all times — it is not
                        cleared once a simulation has run. Plain sentences, no bulleted list. */}
                    <div className="m-0 space-y-1 text-sm text-outer-space-300">
                        <p className="m-0">
                            Simulation is free and will run this transaction against the latest confirmed ledger state.
                        </p>
                        <p className="m-0">
                            No state changes will be persisted and all signature checks will be disabled.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Brand-green (accent) fill. The label is always "Simulate" (never swapped for
                            "Retry"); while a run is in flight the label is hidden — kept in flow so the
                            button keeps its exact size — and a spinner is overlaid centred on top. The
                            last-run time sits inline beside the button, vertically centred. */}
                        <Button
                            variant="accent"
                            size="default"
                            className="relative px-4"
                            disabled={isSimulating}
                            onClick={simulate}
                        >
                            <span className={cn(isSimulating && 'invisible')}>Simulate</span>
                            {isSimulating && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <span
                                        className="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-label="Simulating"
                                    />
                                </span>
                            )}
                        </Button>
                        <LastSimulatedAt simulation={simulation} />
                    </div>
                    {simulation.status === 'error' && (
                        <Card ui="dashkit">
                            <CardBody ui="dashkit" className="!p-3">
                                <div>
                                    Simulation Failure:
                                    <span className="ml-2 text-yellow-500">{simulation.error}</span>
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </section>

                {hasLogs && (
                    <div id="logs" style={anchorStyle}>
                        <CollapsibleSection title={<SimulatedTitle>Logs</SimulatedTitle>}>
                            <ProgramLogsCardBody
                                message={message}
                                logs={logs}
                                cluster={cluster}
                                url={url}
                                className={DENSE_ROW_PADDING}
                            />
                        </CollapsibleSection>
                    </div>
                )}

                {result && logs && (
                    <div id="cu-profiling" style={anchorStyle}>
                        <SimulatorCUProfilingCard
                            message={message}
                            logs={logs}
                            unitsConsumed={result.unitsConsumed}
                            cluster={cluster}
                            epoch={result.epoch}
                            title={<SimulatedTitle>CU profiling</SimulatedTitle>}
                        />
                    </div>
                )}

                {succeeded && !!result?.solBalanceChanges?.length && (
                    <div id="sol-balance-changes" style={anchorStyle}>
                        <SolBalanceChangesCard
                            balanceChanges={result.solBalanceChanges}
                            title={<SimulatedTitle>SOL Balance Changes</SimulatedTitle>}
                            collapsible
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
