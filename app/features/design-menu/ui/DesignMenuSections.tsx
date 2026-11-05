'use client';

import { NftHeaderVariantSection } from '@components/account/nft-header-variant';
import { useAtom } from 'jotai';

import { metadataProxyOverrideAtom } from '@/app/shared/lib/metadata-proxy-override';
import { DesignMenuSection, DesignMenuSwitch } from '@/app/shared/ui/design-menu';

// REVIEW(HOO-921): what this task's review compares. The menu shell around it is task-independent; a client module,
// because the sections read client-only state and the server layout must not import them.

/** The design menu's content for HOO-921. */
export function DesignMenuSections() {
    return (
        <>
            <NftHeaderVariantSection />
            <MetadataProxySection />
        </>
    );
}

function MetadataProxySection() {
    const [override, setOverride] = useAtom(metadataProxyOverrideAtom);
    const bypassed = !(override ?? process.env.NEXT_PUBLIC_METADATA_ENABLED === 'true');
    return (
        <DesignMenuSection title="Metadata">
            <DesignMenuSwitch
                label="Bypass the proxy"
                checked={bypassed}
                onCheckedChange={bypass => {
                    setOverride(!bypass);
                    // Loaded metadata and image verdicts are cached for the page's life; a reload asks again.
                    window.location.reload();
                }}
            />
            <p className="m-0 text-xs text-outer-space-300">
                Off sends metadata through the proxy, which this preview has turned off, so the art shows its
                placeholder.
            </p>
        </DesignMenuSection>
    );
}
