import React from 'react';

import { InstructionCardView } from '../ui/InstructionCardView';
import { InstructionFields } from '../ui/InstructionFields';
import type { InstructionFieldList } from './fields';
import type { InstructionNode } from './node';

export type InstructionCardProps<I> = { node: InstructionNode; info: I };

export type InstructionCardSpec<I> = {
    /** A function when the title depends on the decoded payload. */
    title: string | ((info: I) => string);
    fields: (info: I) => InstructionFieldList;
    /** Open the card in raw mode, as `UnknownDetailsCard` does. */
    defaultRaw?: boolean;
};

/**
 * Builds a card from a declaration of what it shows.
 *
 * A card that needs real markup skips this and renders `InstructionCardView`
 * directly with its own children — the factory is a shorthand for the common
 * label/value shape, not a required abstraction.
 */
export function defineInstructionCard<I>(spec: InstructionCardSpec<I>): React.FC<InstructionCardProps<I>> {
    function Card({ node, info }: InstructionCardProps<I>) {
        const title = typeof spec.title === 'function' ? spec.title(info) : spec.title;

        return (
            <InstructionCardView node={node} title={title} defaultRaw={spec.defaultRaw}>
                <InstructionFields fields={spec.fields(info)} programId={node.ix.programId} />
            </InstructionCardView>
        );
    }

    Card.displayName = `InstructionCard(${typeof spec.title === 'string' ? spec.title : 'dynamic'})`;
    return Card;
}
