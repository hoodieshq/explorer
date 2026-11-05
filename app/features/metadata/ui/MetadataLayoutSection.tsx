'use client';

import { useAtom } from 'jotai';

import { DesignMenuOptions, DesignMenuSection, DesignMenuSwitch } from '@/app/shared/ui/design-menu';

import { metadataLayoutAtom, toMetadataLayout } from '../model/layout-variant';
import { mockMetaplexAtom } from '../model/mock-metaplex';

// REVIEW(HOO-928): design menu switches for the Metadata tab: its layout and a made-up Metaplex source; remove with
// the menu.
export function MetadataLayoutSection() {
    const [stored, setLayout] = useAtom(metadataLayoutAtom);
    const layout = toMetadataLayout(stored);
    const [mockMetaplex, setMockMetaplex] = useAtom(mockMetaplexAtom);
    return (
        <DesignMenuSection title="Metadata tab">
            <DesignMenuOptions
                options={[
                    { label: 'Sections', value: 'sections' },
                    // The primary variant: starred in the menu, which also says so under the buttons.
                    { label: 'Tabs', primary: true, value: 'tabs' },
                ]}
                value={layout}
                onChange={setLayout}
            />
            <p className="m-0 text-xs text-outer-space-300">
                <span className="text-dark-accent">★ Tabs is the primary variant.</span> Sections is for comparison.
            </p>
            <DesignMenuSwitch label="Mock a Metaplex source" checked={mockMetaplex} onCheckedChange={setMockMetaplex} />
            <p className="m-0 text-xs text-outer-space-300">
                Adds a made-up «Metaplex (mock)» tab to a Token-2022 mint with metadata, e.g. PYUSD.
            </p>
        </DesignMenuSection>
    );
}
