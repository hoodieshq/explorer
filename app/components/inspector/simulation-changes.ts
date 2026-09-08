// How to read a simulation's SOL balance changes: whether a run's deltas can be trusted, and how to
// explain it when they cannot. Shared by the Account List's Change column and the hint above it.
import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';

// A simulation can complete (`status: 'done'`) yet still carry an execution error — the run reverted.
// Its SOL balance changes come from that failed execution and are unreliable, so the Change column must
// not present them as results. Only a run that completed *without* an error yields usable deltas; every
// other case (including a failed run) falls back to the Simulate affordance instead.
export function hasReliableChanges(
    simulation: SimulationState,
): simulation is Extract<SimulationState, { status: 'done' }> {
    return simulation.status === 'done' && !simulation.result.error;
}

// A run that reverted (`status: 'done'` carrying an execution error) or that failed outright
// (`status: 'error'`) produces no reliable balance deltas. Without this the Change column would fall
// straight back to the pre-run Simulate affordance, so a completed-but-reverted run looked identical to
// never having run — the failure was only visible down in the Logs. Returns the message to explain it,
// or `undefined` when the run did not fail. The `done`-with-error case only carries a generic
// `TransactionError`, so it points at the Logs rather than repeating it.
export function simulationFailureMessage(simulation: SimulationState): string | undefined {
    if (simulation.status === 'error') return simulation.error;
    if (simulation.status === 'done' && simulation.result.error) {
        return 'Transaction reverted during simulation — see the Logs for the program error.';
    }
    return undefined;
}
