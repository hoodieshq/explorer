import { ArgTypes, Canvas, Description, DocsStory, Heading, type Of, Title } from '@storybook/addon-docs/blocks';
import React from 'react';

export type DocsStoryGroup = {
    title: string;
    /** The interactive prototype that heads the group. */
    prototype: Of;
    /** The states the prototype can show, each as its own story under it. */
    states: Of[];
};

/**
 * An autodocs page whose stories are grouped under their interactive prototypes: each group is a heading with the
 * prototype's description and canvas, followed by its state stories. Usage: `parameters.docs.page: () =>
 * <GroupedDocsPage groups={[...]} />`; a function, so the story exports it names are defined by the time it runs.
 */
export function GroupedDocsPage({ groups }: { groups: DocsStoryGroup[] }) {
    return (
        <>
            <Title />
            <Description />
            {groups.map(group => (
                <React.Fragment key={group.title}>
                    <Heading>{group.title}</Heading>
                    <Description of={group.prototype} />
                    <Canvas of={group.prototype} />
                    {group.states.map((state, index) => (
                        // Index key: the list is fixed by the story file and never reorders.
                        <DocsStory key={index} of={state} expanded />
                    ))}
                </React.Fragment>
            ))}
            <Heading>Props</Heading>
            <ArgTypes />
        </>
    );
}
