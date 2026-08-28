// The right ("Logs") column of the inspector's Programs & Logs row: the Simulation control sits above
// its own results (Logs, then CU profiling), so the simulation lives TOGETHER with the logs it produces
// — mirroring the transaction details page's ProgramLogSection + CUProfilingSection sticky panel. Each
// block keeps its own anchor id (`simulation` / `logs` / `cu-profiling`) for tab navigation. Simulation
// state is owned by the page (LoadedView) and passed in, so this panel and the Account List's "Change"
// column react to the same run.
import { cn } from '@components/shared/utils';
import { useCluster } from '@providers/cluster';
import type { VersionedMessage } from '@solana/web3.js';
import React from 'react';

import { ProgramLogsCardBody } from '@/app/components/ProgramLogsCardBody';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { LastSimulatedAt } from '@/app/features/instruction-simulation/ui/LastSimulatedAt';
import { SIM_ZONE_STYLE } from '@/app/features/instruction-simulation/ui/sim-zone-style';
import { SimulatorCUProfilingCard } from '@/app/features/instruction-simulation/ui/SimulatorCUProfilingCard';
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';
import { DENSE_ROW_PADDING } from '@/app/shared/ui/Table';

// A block's title paired with a "Simulated" tag — the Logs / CU profiling blocks are derived from a
// simulation run, so each carries the badge after its name once real content is present.
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

// Card surface for the simulation-derived blocks (Logs / CU profiling): the dashkit card OUTLINE with no
// filled backing — border only, transparent inside. The page container remaps
// `border-dk-card-outline-dark` → `border-outer-space-800`, so this matches the other outlines.
const OUTLINE_ONLY_CARD = 'rounded-lg border border-solid border-dk-card-outline-dark';

// Empty-state body for a simulation-derived card (Logs / CU profiling) shown before a simulation has run:
// the card is present so its tab has a target, but its content is a left-aligned muted prompt to run the
// simulation. A Simulate button sits at the right edge, revealed on hover/focus of the enclosing card.
function SimEmptyHint({
    children,
    simulate,
    isSimulating,
}: {
    children: React.ReactNode;
    simulate?: () => void;
    isSimulating: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-4 text-left text-sm text-outer-space-300">
            <span>{children}</span>
            <Button
                variant="accent"
                size="sm"
                className="relative shrink-0 px-4 opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
                disabled={isSimulating}
                onClick={simulate}
            >
                <span className={cn(isSimulating && 'invisible')}>Simulate</span>
                {isSimulating && (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className="spinner-border spinner-border-sm" role="status" aria-label="Simulating" />
                    </span>
                )}
            </Button>
        </div>
    );
}

export function InspectorSimulationPanel({
    simulation,
    message,
}: {
    simulation: SimulationState;
    message: VersionedMessage;
}) {
    const { cluster, url } = useCluster();

    const result = simulation.status === 'done' ? simulation.result : undefined;
    const logs = result?.logs;
    const hasLogs = !!logs?.length;
    const isSimulating = simulation.status === 'simulating';
    // `simulate` is present on every state except `simulating`.
    const simulate = 'simulate' in simulation ? simulation.simulate : undefined;

    return (
        <div className="flex flex-col space-y-9 lg:space-y-12">
            {/* Simulation — the heading sits OUTSIDE the card; the guidance + Simulate button live INSIDE a
                card carrying the green noise backing (SIM_ZONE_STYLE) and outer-space border.
                `overflow-hidden` keeps the tiled noise and the full-bleed failure band within the rounded
                corners. */}
            <section id="simulation" aria-label="Simulation" className="flex flex-col gap-3">
                <h2 className="m-0 text-lg font-normal text-white">Simulation</h2>
                <div
                    style={SIM_ZONE_STYLE}
                    className="flex flex-col gap-3 overflow-hidden rounded-lg border border-solid border-outer-space-800 p-4 lg:p-6"
                >
                    {/* Guidance stays between the heading and the button at all times — it is not cleared
                        once a simulation has run. */}
                    <div className="m-0 space-y-1 text-sm text-outer-space-300">
                        <p className="m-0">
                            Simulation is free and will run this transaction against the latest confirmed ledger state.
                        </p>
                        <p className="m-0">
                            No state changes will be persisted and all signature checks will be disabled.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Brand-green (accent) fill. The label is always "Simulate"; while a run is in flight
                            the label is hidden — kept in flow so the button keeps its exact size — and a
                            spinner is overlaid centred on top. The last-run time sits inline beside it. */}
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
                        // Full-bleed to the card edges (negative margins cancel the card padding, incl. the
                        // bottom so it reaches the rounded corner). A top border draws the full-width divider;
                        // below it sits the failure text.
                        <div className="-mx-4 -mb-4 mt-1 border-0 border-t border-solid border-outer-space-800 px-4 py-3 lg:-mx-6 lg:-mb-6 lg:mt-3 lg:px-6">
                            <span className="text-sm text-white">Simulation Failure:</span>
                            <span className="ml-2 break-all text-sm text-yellow-500">{simulation.error}</span>
                        </div>
                    )}
                </div>
            </section>

            {/* Logs and CU profiling are always present so their tabs have a scroll target; before a
                simulation runs they show an empty-state prompt instead of results. The "Simulated" badge is
                only added once real content is in the card. */}
            <div id="logs">
                <CollapsibleSection
                    title={hasLogs ? <SimulatedTitle>Logs</SimulatedTitle> : 'Logs'}
                    className={cn(OUTLINE_ONLY_CARD, !hasLogs && 'group')}
                >
                    {hasLogs ? (
                        <ProgramLogsCardBody
                            message={message}
                            logs={logs}
                            cluster={cluster}
                            url={url}
                            className={DENSE_ROW_PADDING}
                        />
                    ) : (
                        <SimEmptyHint simulate={simulate} isSimulating={isSimulating}>
                            Run the simulation to view the program logs.
                        </SimEmptyHint>
                    )}
                </CollapsibleSection>
            </div>

            <div id="cu-profiling">
                {result && logs ? (
                    <CollapsibleSection
                        title={<SimulatedTitle>CU profiling</SimulatedTitle>}
                        className={OUTLINE_ONLY_CARD}
                    >
                        <SimulatorCUProfilingCard
                            message={message}
                            logs={logs}
                            unitsConsumed={result.unitsConsumed}
                            cluster={cluster}
                            epoch={result.epoch}
                            headerless
                        />
                    </CollapsibleSection>
                ) : (
                    <CollapsibleSection title="CU profiling" className={cn(OUTLINE_ONLY_CARD, 'group')}>
                        <SimEmptyHint simulate={simulate} isSimulating={isSimulating}>
                            Run the simulation to view CU profiling.
                        </SimEmptyHint>
                    </CollapsibleSection>
                )}
            </div>
        </div>
    );
}
