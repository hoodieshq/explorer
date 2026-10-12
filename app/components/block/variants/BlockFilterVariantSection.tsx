'use client';

// REVIEW(HOO-1823): the design-menu switch between the block page's filtering variants; remove before the external
// PR, together with the rest of this folder.
import { DesignMenuOptions, DesignMenuSection } from '@/app/shared/ui/design-menu';

import { BLOCK_FILTER_VARIANTS, setBlockFilterVariant, useBlockFilterVariant } from './block-filter-variant';

export function BlockFilterVariantSection() {
    const variant = useBlockFilterVariant();
    const picked = BLOCK_FILTER_VARIANTS.find(option => option.variant === variant);
    return (
        <DesignMenuSection title="Block filters">
            <DesignMenuOptions layout="grid" options={OPTIONS} value={variant} onChange={setBlockFilterVariant} />
            {/* One line when both widths open the same container; two only where they differ (Combined). */}
            {picked && (
                <p className="m-0 text-xs text-outer-space-300">
                    {picked.desktop === picked.mobile ? (
                        <>
                            <span className="text-neutral-200">{picked.desktop}</span> on desktop and mobile
                        </>
                    ) : (
                        <>
                            <span className="text-neutral-200">{picked.desktop}</span> on desktop,{' '}
                            <span className="text-neutral-200">{picked.mobile.toLowerCase()}</span> on mobile
                        </>
                    )}
                </p>
            )}
        </DesignMenuSection>
    );
}

const OPTIONS = BLOCK_FILTER_VARIANTS.map(({ label, variant }) => ({ label, value: variant }));
