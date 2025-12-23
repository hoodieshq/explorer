import { estimateRequestedComputeUnits } from '@/app/utils/compute-units-schedule';
import { CUProfilingCard } from '@features/cu-profiling';
import { useCluster } from '@providers/cluster';
import type { VersionedMessage } from '@solana/web3.js';
import { formatInstructionLogs } from '@utils/cu-profiling';
import type { InstructionLogs } from '@utils/program-logs';
import React from 'react';

type SimulatorCUProfilingCardProps = {
    message: VersionedMessage;
    logs: Array<InstructionLogs>;
    unitsConsumed?: number;
    cluster: ReturnType<typeof useCluster>['cluster'];
    epoch: bigint;
};

export function SimulatorCUProfilingCard({
    message,
    logs,
    unitsConsumed,
    cluster,
    epoch,
}: {
    message: VersionedMessage;
    logs: Array<InstructionLogs>;
    unitsConsumed?: number;
    cluster: ReturnType<typeof useCluster>['cluster'];
    epoch: bigint;
}) {
    const instructionsForCU = React.useMemo(() => {
        const instructions = message.compiledInstructions.map(ix => ({
            data: ix.data,
            programId: message.staticAccountKeys[ix.programIdIndex],
        }));

        return formatInstructionLogs({
            cluster,
            epoch,
            instructionLogs: logs,
            instructions,
        });
    }, [message, logs, cluster, epoch]);

    const requestedUnits = React.useMemo(() => {
        return estimateRequestedComputeUnits(
            {
                transaction: {
                    message: {
                        compiledInstructions: message.compiledInstructions.map(ix => ({
                            data: ix.data,
                            programIdIndex: ix.programIdIndex,
                        })),
                        staticAccountKeys: message.staticAccountKeys,
                    },
                },
            },
            epoch,
            cluster
        );
    }, [message, epoch, cluster]);

    return (
        <CUProfilingCard
            instructions={instructionsForCU}
            unitsConsumed={unitsConsumed}
            unitsRequested={requestedUnits}
        />
    );
}

