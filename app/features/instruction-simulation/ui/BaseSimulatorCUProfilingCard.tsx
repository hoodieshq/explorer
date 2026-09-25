import { BaseCUProfilingCard, formatInstructionLogs, type InstructionCUInput } from '@entities/compute-unit';
import type { TransactionVersion } from '@explorer/parsers/transaction';
import type { useCluster } from '@providers/cluster';
import type { InstructionLogs } from '@utils/program-logs';
import { useMemo } from 'react';

type BaseSimulatorCUProfilingCardProps = {
    /** One row per instruction, in `compiledInstructions` order — see useSimulationInstructionNames. */
    instructions: InstructionCUInput[];
    logs: Array<InstructionLogs>;
    unitsConsumed?: number;
    cluster: ReturnType<typeof useCluster>['cluster'];
    epoch: bigint;
    /** Absent when the simulation's version is unknown - v1 has no per-instruction reserve to show. */
    transactionVersion?: TransactionVersion;
    /**
     * Render only the chart + legend body, without the built-in card chrome/header, so a caller can supply
     * its own section header (e.g. the inspector's header-outside layout). Defaults to false.
     */
    headerless?: boolean;
};

export function BaseSimulatorCUProfilingCard({
    instructions,
    logs,
    unitsConsumed,
    cluster,
    epoch,
    transactionVersion,
    headerless = false,
}: BaseSimulatorCUProfilingCardProps) {
    const instructionsForCU = useMemo(
        () => formatInstructionLogs({ cluster, epoch, instructionLogs: logs, instructions, transactionVersion }),
        [instructions, logs, cluster, epoch, transactionVersion],
    );

    return (
        <BaseCUProfilingCard instructions={instructionsForCU} unitsConsumed={unitsConsumed} headerless={headerless} />
    );
}
