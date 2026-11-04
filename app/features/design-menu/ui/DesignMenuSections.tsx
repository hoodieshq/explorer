'use client';

import { useSetAtom } from 'jotai';

import {
    NFTOKEN_HEADER_VARIANTS,
    nftokenHeaderVariantAtom,
    useNftokenHeaderVariant,
} from '@/app/shared/lib/nftoken-header-variant';
import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

// REVIEW(HOO-929): what this task's review compares. The menu shell around it is task-independent; a client module,
// because the sections read client-only state and the server layout must not import them.

/** The design menu's content for HOO-929. */
export function DesignMenuSections() {
    return <NftokenHeaderVariantSection />;
}

function NftokenHeaderVariantSection() {
    const variant = useNftokenHeaderVariant();
    const setVariant = useSetAtom(nftokenHeaderVariantAtom);
    return (
        <DesignMenuSection title="NFToken header">
            <DesignMenuOptions options={NFTOKEN_HEADER_VARIANTS} value={variant} onChange={setVariant} />
            <p className="m-0 text-xs text-outer-space-300">
                <span className="text-dark-accent">★</span> — primary
            </p>
        </DesignMenuSection>
    );
}
