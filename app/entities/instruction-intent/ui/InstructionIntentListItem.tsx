'use client';

import { abbreviateAddress } from '@components/shared/address';
import { useCluster } from '@entities/cluster/@x/instruction-intent';
import { buildProgramName, type SupportedIdl, useProgramIdls } from '@entities/idl/@x/instruction-intent';
import type { Cluster } from '@utils/cluster';
import getInstructionCardScrollAnchorId from '@utils/get-instruction-card-scroll-anchor-id';
import { programLabel } from '@utils/tx';
import type { ReactNode } from 'react';

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

    return (
        <BaseInstructionIntentListItem index={index} href={`#${getInstructionCardScrollAnchorId([index + 1])}`}>
            <InstructionIntentListItemBody
                intent={intent}
                programName={toListProgramName({ anchorIdl, cluster, programId, programMetadataIdl })}
            />
        </BaseInstructionIntentListItem>
    );
}

function toListProgramName({
    programId,
    cluster,
    programMetadataIdl,
    anchorIdl,
}: {
    programId: string;
    cluster: Cluster;
    programMetadataIdl: SupportedIdl | undefined;
    anchorIdl: SupportedIdl | undefined;
}): string {
    return (
        programLabel(programId, cluster) ??
        buildProgramName([programMetadataIdl, anchorIdl]) ??
        `Unknown Program (${abbreviateAddress(programId, { head: 5, tail: 5 })})`
    );
}
