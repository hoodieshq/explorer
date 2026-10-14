'use client';

import { useAtom } from 'jotai';

import { DesignMenuSwitch } from '@/app/shared/ui/design-menu';

import { customIdlCatalogVisibleAtom } from '../model/custom-idl/catalog-visibility';

// REVIEW(HOO-1971): review-only; remove with the design menu.

/** Shows or hides the footer link that opens the catalog of uploaded custom IDLs. */
export function CustomIdlCatalogVisibilitySwitch() {
    const [visible, setVisible] = useAtom(customIdlCatalogVisibleAtom);
    return <DesignMenuSwitch label="Custom IDL catalog" checked={visible} onCheckedChange={setVisible} />;
}
