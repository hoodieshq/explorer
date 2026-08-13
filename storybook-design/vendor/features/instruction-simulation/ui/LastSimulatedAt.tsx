import React from 'react';

import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';

// Captures the wall-clock time of the last finished run (the transition out of `simulating`, on
// success OR error). The simulation model carries no timestamp; a result already cached on mount is
// not stamped since its true run time is unknown. Callers that live outside the panel (e.g. the merged
// Account List's header popover) use this to show the same time — each tracker captures the same
// transition, so the values agree.
export function useLastSimulatedAt(simulation: SimulationState): Date | undefined {
    const status = simulation.status;
    const [at, setAt] = React.useState<Date | undefined>(undefined);
    const prevStatus = React.useRef(status);

    React.useEffect(() => {
        if (prevStatus.current === 'simulating' && (status === 'done' || status === 'error')) {
            setAt(new Date());
        }
        prevStatus.current = status;
    }, [status]);

    return at;
}

// Renders "Simulated at HH:MM:SS" for an already-captured time.
export function LastSimulatedAtLabel({ at }: { at: Date }) {
    return (
        <p className="m-0 text-xs text-outer-space-300">
            Simulated at{' '}
            <span className="text-outer-space-200">
                {at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </p>
    );
}

// Inline tracker + label shown right after the Simulate button in variants 2 (Enhancements) and 3
// (Match to TX view). Renders nothing until a run has finished.
export function LastSimulatedAt({ simulation }: { simulation: SimulationState }) {
    const at = useLastSimulatedAt(simulation);
    // eslint-disable-next-line unicorn/no-null -- nothing to show before the first finished run
    if (!at) return null;
    return <LastSimulatedAtLabel at={at} />;
}
