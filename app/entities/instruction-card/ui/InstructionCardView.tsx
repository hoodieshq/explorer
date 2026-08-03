import React from 'react';

import type { InstructionNode } from '../model/node';
import { useInstructionSurface } from '../model/surface';

/**
 * Draws one instruction card on whatever surface it finds itself on.
 *
 * Cards below this point never see the shell, the signature result, or the
 * nested cards — they only describe their own content.
 */
export function InstructionCardView({
    node,
    title,
    defaultRaw,
    children,
}: {
    node: InstructionNode;
    title: string;
    defaultRaw?: boolean;
    children: React.ReactNode;
}) {
    const { Shell, result } = useInstructionSurface();

    return (
        <Shell
            title={title}
            ix={node.ix}
            index={node.index}
            childIndex={node.childIndex}
            raw={node.raw}
            result={result}
            defaultRaw={defaultRaw}
            innerCards={node.innerCards}
        >
            {children}
        </Shell>
    );
}
