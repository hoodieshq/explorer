'use client';

import { BlockFilterVariantSection } from '@/app/components/block/variants/BlockFilterVariantSection';

// REVIEW(HOO-1823): what this task's review compares. The menu shell around it is task-independent; a client module,
// because the sections read client-only state and the server layout must not import them.

/** The design menu's content for HOO-1823: the block page's filtering variants. */
export function DesignMenuSections() {
    return <BlockFilterVariantSection />;
}
