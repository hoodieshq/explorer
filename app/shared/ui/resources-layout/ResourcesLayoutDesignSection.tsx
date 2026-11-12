'use client';

import { useAtom } from 'jotai';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

import { resourcesLayoutAtom } from './model';

// REVIEW(home-key-value-cards): the design-menu switch for the developer resources layout; remove with the menu.
export function ResourcesLayoutDesignSection() {
    const [layout, setLayout] = useAtom(resourcesLayoutAtom);
    return (
        <DesignMenuSection title="Developer resources">
            <DesignMenuOptions
                options={[
                    { label: 'Row', value: 'row' },
                    { label: 'Cards', value: 'cards' },
                    { label: 'Grid', value: 'grid' },
                    { label: 'List', value: 'list' },
                    { label: 'Featured', value: 'featured' },
                ]}
                value={layout}
                onChange={setLayout}
            />
        </DesignMenuSection>
    );
}
