'use client';

import { useAtom } from 'jotai';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

import { metadataLayoutAtom, toMetadataLayout } from '../model/layout-variant';

// REVIEW(HOO-928): design menu switch for the Metadata tab's layout; remove with the menu.
export function MetadataLayoutSection() {
    const [stored, setLayout] = useAtom(metadataLayoutAtom);
    const layout = toMetadataLayout(stored);
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
        </DesignMenuSection>
    );
}
