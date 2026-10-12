'use client';

import { CustomIdlCatalogVisibilitySwitch, CustomIdlHighlightPicker, CustomIdlSurfacesPicker } from '@entities/idl';

// REVIEW(HOO-1971): what this task's review compares. The menu shell around it is task-independent; a client module,
// because the sections read client-only state and the server layout must not import them.

/** The design menu's content for HOO-1971: custom-IDL highlight variants, pages and the catalog link. */
export function DesignMenuSections() {
    return (
        <>
            <CustomIdlHighlightPicker />
            <CustomIdlSurfacesPicker />
            <CustomIdlCatalogVisibilitySwitch />
        </>
    );
}
