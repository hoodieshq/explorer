import { CUProfilingCard, formatInstructionLogs } from '@entities/compute-unit';
import { useCluster } from '@providers/cluster';
import type { VersionedMessage } from '@solana/web3.js';
import type { InstructionLogs } from '@utils/program-logs';
import { useMemo } from 'react';

type SimulatorCUProfilingCardProps = {
    message: VersionedMessage;
    logs: Array<InstructionLogs>;
    unitsConsumed?: number;
    cluster: ReturnType<typeof useCluster>['cluster'];
    epoch: bigint;
    /**
     * Render only the chart + legend body, without the built-in card chrome/header, so a caller can supply
     * its own section header (e.g. the inspector's header-outside layout). Defaults to false — existing
     * callers keep the self-contained {@link CUProfilingCard}.
     */
    headerless?: boolean;
};

export function SimulatorCUProfilingCard({
    message,
    logs,
    unitsConsumed,
    cluster,
    epoch,
    headerless = false,
}: SimulatorCUProfilingCardProps) {
    const instructionsForCU = useMemo(() => {
        const instructions = message.compiledInstructions.map(ix => ({
            programId: message.staticAccountKeys[ix.programIdIndex],
        }));

        return formatInstructionLogs({
            cluster,
            epoch,
            instructionLogs: logs,
            instructions,
        });
    }, [message, logs, cluster, epoch]);

    return <CUProfilingCard instructions={instructionsForCU} unitsConsumed={unitsConsumed} headerless={headerless} />;
}
