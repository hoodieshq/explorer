'use client';

import { useAtom } from 'jotai';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

import { navSearchVariantAtom } from './search-variant';

// REVIEW(HOO-935): the design menu's section for the navbar search on phones; remove with the menu.

export function NavSearchDesignSection() {
    const [variant, setVariant] = useAtom(navSearchVariantAtom);
    return (
        <DesignMenuSection title="Search on phones">
            <DesignMenuOptions
                options={[
                    { label: 'Button', value: 'button' },
                    { label: 'Field', value: 'field' },
                ]}
                value={variant}
                onChange={setVariant}
            />
        </DesignMenuSection>
    );
}
