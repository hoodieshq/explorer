'use client';

import { useAtom } from 'jotai';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

import { sectionActionsVariantAtom } from './model';

// REVIEW(home-key-value-cards): the design-menu switch for the section title links; remove with the menu.
export function SectionActionsDesignSection() {
    const [variant, setVariant] = useAtom(sectionActionsVariantAtom);
    return (
        <DesignMenuSection title="Section links on phones">
            <DesignMenuOptions
                options={[
                    { label: 'New line', value: 'wrap' },
                    { label: 'Icons', value: 'icon' },
                ]}
                value={variant}
                onChange={setVariant}
            />
        </DesignMenuSection>
    );
}
