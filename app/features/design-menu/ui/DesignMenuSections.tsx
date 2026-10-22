'use client';

import { NftHeaderVariantSection } from '@components/account/nft-header-variant';

// REVIEW(HOO-921): what this task's review compares. The menu shell around it is task-independent; a client module,
// because the sections read client-only state and the server layout must not import them.

/** The design menu's content for HOO-921. */
export function DesignMenuSections() {
    return <NftHeaderVariantSection />;
}
