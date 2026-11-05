import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-928): the Metadata tab's layout picked in the review-only design menu; keep the winner, drop the atom.
//   tabs:     one "Metadata" section holding a card laid out like the MCP docs page's: tabs in its header for several
//             sources, the source's name styled as the active tab for one, the copy button in the header.
//   sections: every metadata source is its own section.
export type MetadataLayout = 'sections' | 'tabs';

const METADATA_LAYOUTS: readonly MetadataLayout[] = ['sections', 'tabs'];

// The default is the primary variant (Tabs). Only a reviewer's flip is stored, so a new default reaches everyone else.
export const metadataLayoutAtom = atomWithStorage<MetadataLayout>('hoo-928:metadata-layout', 'tabs');

/** A layout dropped or renamed since a reviewer stored it (the former `mcp` and `compact`) falls back to the default. */
export function toMetadataLayout(stored: string): MetadataLayout {
    return METADATA_LAYOUTS.find(layout => layout === stored) ?? 'tabs';
}
