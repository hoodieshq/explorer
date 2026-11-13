'use client';

import { abbreviateAddress } from '@components/shared/address';
import { useCluster } from '@entities/cluster/@x/instruction-intent';
import { buildProgramIdlNames, useProgramIdls } from '@entities/idl/@x/instruction-intent';
import { programLabel } from '@utils/tx';
import { type ReactNode, useMemo } from 'react';

import type { InstructionFetchResult } from '../lib/intent';
import { useInstructionIntent } from '../model/use-instruction-intent';
import { BaseInstructionIntentListItem } from './BaseInstructionIntentListItem';

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
    const { idls } = useProgramIdls(programId, url, cluster);
    const intent = useInstructionIntent({ enabled, ixFetchResult, programId });
    const idlNames = useMemo(() => buildProgramIdlNames(idls?.map(({ idl }) => idl) ?? []), [idls]);
    const programName =
        programLabel(programId, cluster) ??
        idlNames?.programName ??
        `Unknown Program (${abbreviateAddress(programId, { head: 5, tail: 5 })})`;

    const instructionName =
        ixFetchResult.status === 'success'
            ? idlNames?.resolveInstructionName?.(ixFetchResult.instruction.data)
            : undefined;

    return (
        <BaseInstructionIntentListItem
            index={index}
            intent={intent}
            programName={programName}
            instructionName={instructionName}
        />
    );
}
