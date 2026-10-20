'use client';

import { abbreviateAddress } from '@components/shared/address';
import { useCluster } from '@entities/cluster/@x/instruction-intent';
import { buildProgramIdlNames, useProgramIdls } from '@entities/idl/@x/instruction-intent';
import getInstructionCardScrollAnchorId from '@utils/get-instruction-card-scroll-anchor-id';
import { programLabel } from '@utils/tx';
import { type ReactNode, useMemo } from 'react';

import type { InstructionFetchResult } from '../lib/intent';
import { useInstructionIntent } from '../model/use-instruction-intent';
import { BaseInstructionIntentListItem } from './BaseInstructionIntentListItem';
import { InstructionIntentListItemBody } from './InstructionIntentListItemBody';

export function InstructionIntentListItem({
    index,
    programId,
    ixFetchResult,
    enabled,
}: {
    index: number;
    programId: string;
    ixFetchResult: InstructionFetchResult;
    enabled: boolean;
}): ReactNode {
    const { cluster, url } = useCluster();
    const { programMetadataIdl, anchorIdl } = useProgramIdls(programId, url, cluster);
    const intent = useInstructionIntent({ enabled, ixFetchResult, programId });
    const idlNames = useMemo(
        () => buildProgramIdlNames([programMetadataIdl, anchorIdl]),
        [programMetadataIdl, anchorIdl],
    );
    const programName =
        programLabel(programId, cluster) ??
        idlNames?.programName ??
        `Unknown Program (${abbreviateAddress(programId, { head: 5, tail: 5 })})`;

    const instructionName =
        ixFetchResult.status === 'success'
            ? idlNames?.resolveInstructionName?.(ixFetchResult.instruction.data)
            : undefined;

    return (
        <BaseInstructionIntentListItem index={index} href={`#${getInstructionCardScrollAnchorId([index + 1])}`}>
            <InstructionIntentListItemBody
                intent={intent}
                programName={programName}
                instructionName={instructionName}
            />
        </BaseInstructionIntentListItem>
    );
}
