import { formatInstructionLogs } from '@entities/compute-unit';
import { type useCluster } from '@providers/cluster';
import type { VersionedMessage } from '@solana/web3.js';
import type { InstructionLogs } from '@utils/program-logs';
import { useMemo } from 'react';

// Deep import: upstream this comes from the `@features/transaction` barrel, which does not
// re-export CollapsibleSection at HEAD.
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';

import { CUProfilingCard } from '../../../entities/compute-unit/ui/CUProfilingCard';

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

    // eslint-disable-next-line unicorn/no-null -- returning null renders nothing when there are no instructions
    if (instructionsForCU.length === 0) return null;

    return (
        <CollapsibleSection title="CU profiling">
            <CUProfilingCard instructions={instructionsForCU} unitsConsumed={unitsConsumed} headerless />
        </CollapsibleSection>
    );
}
