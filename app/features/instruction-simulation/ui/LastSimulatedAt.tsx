import React from 'react';

import { useLastSimulatedAt } from '../model/use-last-simulated-at';
import { type SimulationState } from '../model/use-simulation';

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

// Inline tracker + label shown right after the Simulate button. Renders nothing until a run has finished.
export function LastSimulatedAt({ simulation }: { simulation: SimulationState }) {
    const at = useLastSimulatedAt(simulation);
    // eslint-disable-next-line unicorn/no-null -- nothing to show before the first finished run
    if (!at) return null;
    return <LastSimulatedAtLabel at={at} />;
}
