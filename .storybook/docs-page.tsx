import {
    ArgTypes,
    Canvas,
    Description,
    DocsPage,
    DocsStory,
    Heading,
    Title,
    useOf,
} from '@storybook/addon-docs/blocks';
import React from 'react';

/**
 * `parameters.docs.groups`: the stories of a file grouped under the interactive prototype that heads each group.
 * Stories are named by their export, so a meta can list them before they are defined.
 */
export type DocsStoryGroup = {
    title: string;
    /** Export name of the interactive prototype that heads the group. */
    prototype: string;
    /** Export names of the states the prototype can show, each shown under it. */
    states: string[];
};

/**
 * The project's autodocs page (`parameters.docs.page` in the preview). Without extra parameters it is the stock page.
 * `parameters.docs.groups` groups the stories under their prototypes; `parameters.docs.guide` leaves only the title
 * and the description, for a page of prose. Set once here rather than per story file: a story file that imports the
 * doc blocks fails to load in the story tests ("Illegal invocation"), which share one browser page across files.
 */
export function ProjectDocsPage() {
    const { csfFile, preparedMeta } = useOf('meta', ['meta']);
    // `parameters` is untyped; these two keys are this page's own.
    const { groups, guide }: { groups?: DocsStoryGroup[]; guide?: boolean } = preparedMeta.parameters.docs ?? {};

    if (guide) {
        return (
            <>
                <Title />
                <Description />
            </>
        );
    }
    if (!groups) return <DocsPage />;

    const story = (name: string) => csfFile.moduleExports[name];

    return (
        <>
            <Title />
            <Description />
            {groups.map(group => (
                <React.Fragment key={group.title}>
                    <Heading>{group.title}</Heading>
                    <Description of={story(group.prototype)} />
                    <Canvas of={story(group.prototype)} />
                    {group.states.map(state => (
                        <DocsStory key={state} of={story(state)} expanded />
                    ))}
                </React.Fragment>
            ))}
            <Heading>Props</Heading>
            <ArgTypes />
        </>
    );
}
