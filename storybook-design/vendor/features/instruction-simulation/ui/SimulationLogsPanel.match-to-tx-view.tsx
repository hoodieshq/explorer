// Match-to-TX-view-only pieces of the simulation zone, split so the page can lay them out like the
// transaction details page: the Simulation control + Logs + CU profiling live TOGETHER in the sticky
// right ("Logs") column (mirrors ProgramLogSection + CUProfilingSection on the TX page), while SOL
// Balance Changes is a separate full-width block in the "Tokens" slot. This is a private copy of the
// relevant bits of SimulationSections with no green full-bleed zone — SimulationSections stays exactly
// as-is so the Enhancements page is untouched.
import { cn } from '@components/shared/utils';
import { useCluster } from '@providers/cluster';
import type { VersionedMessage } from '@solana/web3.js';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';

import { ProgramLogsCardBody } from '../../../components/ProgramLogsCardBody';
import { DENSE_ROW_PADDING } from '../../../shared/ui/Table/dense-row-padding';
import { LastSimulatedAt } from './LastSimulatedAt';
// Reuse variant 2's (Enhancements) exact green noise background for the simulation card surface.
import { SIM_ZONE_STYLE } from './SimulationSections';
import { SimulatorCUProfilingCard } from './SimulatorCUProfilingCard';

// A block's title paired with a "Simulated" tag — the Logs / CU profiling / SOL Balance Changes blocks
// are all derived from a simulation run, so each carries the badge after its name.
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

// Card surface for the simulation-derived blocks (Logs / CU profiling): the dashkit card OUTLINE with
// no filled backing — border only, transparent inside. Mirrors baseCardVariants({ ui: 'dashkit' })
// minus its `bg-dk-gray-800-dark shadow-dk-card` fill (and the default `mb-6`). The page container
// remaps `border-dk-card-outline-dark` → `border-outer-space-800`, so this matches the other outlines.
const OUTLINE_ONLY_CARD = 'rounded-lg border border-solid border-dk-card-outline-dark';

// Empty-state body for a simulation-derived card (Logs / CU profiling) shown before a simulation has
// run: the card is present so its tab has a target, but its content is a left-aligned muted prompt
// telling the user to run the simulation to populate it. A Simulate button sits at the right edge,
// revealed on hover of the enclosing card (the card body carries `group`) or on keyboard focus.
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

/** The right ("Logs") column of the Programs & Logs row: the Simulation control sits above its own
 *  results (Logs, then CU profiling) — the simulation is moved in here to live together with the logs.
 *  Each block keeps its own anchor id (`simulation` / `logs` / `cu-profiling`) for tab navigation. */
export function SimulationLogsPanel({
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
            {/* Simulation — laid out like the other blocks: the heading sits OUTSIDE the card, and the
                guidance + Simulate button live INSIDE a card carrying the original green noise backing
                (SIM_ZONE_STYLE) and outer-space border. `overflow-hidden` keeps the tiled noise and the
                full-bleed failure band within the rounded corners. */}
            <section id="simulation" aria-label="Simulation" className="flex flex-col gap-3">
                <h2 className="m-0 text-lg font-normal text-white">Simulation</h2>
                <div
                    style={SIM_ZONE_STYLE}
                    className="flex flex-col gap-3 overflow-hidden rounded-lg border border-solid border-outer-space-800 p-4 lg:p-6"
                >
                    {/* Guidance stays between the heading and the button at all times — it is not cleared
                        once a simulation has run. Plain sentences, no bulleted list. */}
                    <div className="m-0 space-y-1 text-sm text-outer-space-300">
                        <p className="m-0">
                            Simulation is free and will run this transaction against the latest confirmed ledger state.
                        </p>
                        <p className="m-0">
                            No state changes will be persisted and all signature checks will be disabled.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Brand-green (accent) fill. The label is always "Simulate"; while a run is in
                            flight the label is hidden — kept in flow so the button keeps its exact size —
                            and a spinner is overlaid centred on top. The last-run time sits inline beside
                            the button, vertically centred. */}
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
                        // Full-bleed to the card edges (negative margins cancel the card padding, incl.
                        // the bottom so it reaches the rounded corner). A top border draws the full-width
                        // divider; below it sits the failure text. `mt-1 lg:mt-3` tops up the card's
                        // `gap-3` (12px) so the space under the button equals the card side padding.
                        <div className="-mx-4 -mb-4 mt-1 border-0 border-t border-solid border-outer-space-800 px-4 py-3 lg:-mx-6 lg:-mb-6 lg:mt-3 lg:px-6">
                            <span className="text-sm text-white">Simulation Failure:</span>
                            <span className="ml-2 break-all text-sm text-yellow-500">{simulation.error}</span>
                        </div>
                    )}
                </div>
            </section>

            {/* Logs and CU profiling are always present so their tabs have a scroll target; before a
                simulation runs they show an empty-state prompt instead of results. The "Simulated"
                badge is only added once real content is in the card. */}
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
                    <SimulatorCUProfilingCard
                        message={message}
                        logs={logs}
                        unitsConsumed={result.unitsConsumed}
                        cluster={cluster}
                        epoch={result.epoch}
                        title={<SimulatedTitle>CU profiling</SimulatedTitle>}
                        className={OUTLINE_ONLY_CARD}
                    />
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
