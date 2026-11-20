import { InstructionNodeCard } from '@components/instruction/InstructionNodeCard';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import {
    inspectorSurface,
    instructionDataOf,
    InstructionNodeCards,
    InstructionSurfaceProvider,
    toInstructionNode,
} from '@entities/instruction-card';
import type { VersionedMessage } from '@solana/web3.js';
import { useMemo } from 'react';

import { ErrorCard } from '../common/ErrorCard';
import { LoadingCard } from '../common/LoadingCard';
import type { DecodedMessageResult } from './use-decoded-message';

export function InstructionsSection({
    message,
    decodedMessage,
}: {
    message: VersionedMessage;
    decodedMessage: DecodedMessageResult;
}) {
    const nodes = useMemo(() => {
        if (decodedMessage.status !== 'ready') return undefined;
        const { instructions, innerIxByIndex } = decodedMessage.decoded;
        return instructions.map((ix, index) =>
            toInstructionNode({
                children: innerIxByIndex
                    ?.get(index)
                    ?.map((cpi, childIndex) => cpi && toInstructionNode({ childIndex, index, ix: cpi })),
                index,
                ix,
            }),
        );
    }, [decodedMessage]);
    const surface = useMemo(
        () => inspectorSurface({ Card: InstructionNodeCard, instructionData: instructionDataOf(nodes ?? []) }),
        [nodes],
    );

    if (decodedMessage.status === 'failed') {
        return (
            <ErrorCard
                text={`Failed to fetch address lookup table: ${message.addressTableLookups[
                    decodedMessage.failedLookupIndex
                ].accountKey.toString()}`}
            />
        );
    }

    if (!nodes) {
        return <LoadingCard />;
    }

    return (
        <CollapsibleSection id="instructions" title="Instructions" className="">
            <InstructionSurfaceProvider surface={surface}>
                <InstructionNodeCards nodes={nodes} />
            </InstructionSurfaceProvider>
        </CollapsibleSection>
    );
}
