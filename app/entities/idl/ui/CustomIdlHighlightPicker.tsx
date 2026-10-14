'use client';

import { useAtom } from 'jotai';

import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

import {
    CUSTOM_IDL_HIGHLIGHT_VARIANTS,
    type CustomIdlHighlightVariant,
    customIdlHighlightVariantAtom,
} from '../model/custom-idl/highlight-variant';

// REVIEW(HOO-1971): design-menu section; remove with the variants the team does not pick.

/** Switch between the custom-IDL highlight variants, kept in this browser. */
export function CustomIdlHighlightPicker() {
    const [variant, setVariant] = useAtom(customIdlHighlightVariantAtom);
    return (
        <DesignMenuSection title="IDL highlight">
            <DesignMenuOptions
                options={CUSTOM_IDL_HIGHLIGHT_VARIANTS.map(value => ({ label: LABELS[value], value }))}
                value={variant}
                onChange={setVariant}
            />
        </DesignMenuSection>
    );
}

const LABELS: Record<CustomIdlHighlightVariant, string> = { marker: 'Marker', off: 'Off', row: 'Rows' };
