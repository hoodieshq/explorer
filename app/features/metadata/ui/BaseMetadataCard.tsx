import { ErrorCard } from '@components/common/ErrorCard';
import { JsonViewer } from '@components/common/JsonViewer';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cva } from 'class-variance-authority';
import { type ReactNode, useState } from 'react';

import { withStringsInsteadOfBigInts } from '@/app/shared/lib/bigint-to-string';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';
import { Card } from '@/app/shared/ui/Card';
import { CardTabs } from '@/app/shared/ui/card-tabs';
import { InlineCopyButton } from '@/app/shared/ui/json-view';
import { PageSections } from '@/app/shared/ui/page-layout';
import { ROW_PADDING } from '@/app/shared/ui/spacing';

import type { MetadataLayout } from '../model/layout-variant';

export type MetadataSection = {
    id: string;
    title: string;
    data: object;
};

/**
 * The metadata sources of an account: the Token-2022 extension, the Metaplex account, or the off-chain JSON
 * of a compressed NFT. `tabs` puts them in one "Metadata" section, named after the page tab, on a card laid out
 * like the MCP docs page's: tabs in the card's header for several sources, the source's name as a mono label for
 * one, and the copy button at the header's end. `sections` (REVIEW(HOO-928), kept for comparison) gives every
 * source its own collapsible section, one after another.
 */
export function BaseMetadataCard({
    sections,
    layout = 'tabs',
}: {
    sections: MetadataSection[];
    layout?: MetadataLayout;
}) {
    if (sections.length === 0) {
        return <ErrorCard text="No metadata found" />;
    }

    if (layout === 'tabs') {
        return (
            // `className=""` keeps the section wrapper bare so the surface comes from the card inside.
            <CollapsibleSection title="Metadata" className="">
                <TabsMetadataCard sections={sections} />
            </CollapsibleSection>
        );
    }

    return (
        <PageSections>
            {sections.map(section => (
                <MetadataSurface key={section.id} title={section.title}>
                    <JsonBody data={section.data} />
                </MetadataSurface>
            ))}
        </PageSections>
    );
}

function MetadataSurface({ title, children }: { title: string; children: ReactNode }) {
    return (
        // `className=""` keeps the section wrapper bare so the surface comes from the `Card` inside.
        <CollapsibleSection title={title} className="">
            <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                {children}
            </Card>
        </CollapsibleSection>
    );
}

function JsonBody({ data }: { data: object }) {
    return (
        <div className={ROW_PADDING}>
            <JsonViewer version="v2" src={data} />
        </div>
    );
}

// Laid out like the MCP docs page's code card (`CodeCard`, `Tools`): its header and mono label, on the app's card
// surface, border and divider colors; the tabs take the regular tabs' font and colors.
function TabsMetadataCard({ sections }: { sections: MetadataSection[] }) {
    const [activeId, setActiveId] = useState(sections[0].id);
    const active = sections.find(section => section.id === activeId) ?? sections[0];
    const [copyState, copy] = useCopyToClipboard(1000);
    return (
        <div className="w-full overflow-hidden rounded-lg border border-solid border-outer-space-800 bg-outer-space-900">
            <div className={tabsHeaderVariants({ content: sections.length > 1 ? 'tabs' : 'label' })}>
                {sections.length > 1 ? (
                    <CardTabs
                        items={sections.map(section => ({ id: section.id, label: section.title }))}
                        onChange={setActiveId}
                        value={active.id}
                        look="plain"
                    />
                ) : (
                    <span className="flex-1 font-mono text-xs uppercase tracking-widest text-heavy-metal-500">
                        {active.title}
                    </span>
                )}
                <span className="flex shrink-0 items-center">
                    <InlineCopyButton
                        noun="JSON"
                        state={copyState}
                        onCopy={() => copy(JSON.stringify(withStringsInsteadOfBigInts(active.data), undefined, 2))}
                    />
                </span>
            </div>
            {/* The key-value rows' padding (`ROW_PADDING`), as the other Metadata layouts. */}
            <div className={ROW_PADDING}>
                <JsonViewer version="v2" src={active.data} blockCopy={false} />
            </div>
        </div>
    );
}

// Tabs stretch to the header's height, so the active tab's underline meets its bottom line (as in `Tools`); a label
// sits in a 12px band (as in `CodeCard`). Tabs and label start 12px in, as the key-value rows' text (`ROW_PADDING`);
// the 13px copy button keeps as far from the right edge as from the top and bottom ones: (40 - 13) / 2 beside a
// label, (48 - 13) / 2 beside the taller tabs.
const tabsHeaderVariants = cva('flex w-full gap-2.5 border-0 border-b border-solid border-outer-space-800 pl-3', {
    variants: { content: { label: 'items-center py-3 pr-[13.5px]', tabs: 'items-stretch pr-[17.5px]' } },
});
