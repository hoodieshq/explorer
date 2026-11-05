'use client';

import {
    NftCreatorsVariantSections,
    useNftCreatorsPlacement,
    useNftCreatorsShare,
    useNftCreatorsUnverified,
} from '@components/account/nft-creators-variant';
import { applyDesignLink, designLinkHref } from '@components/account/nft-design-link';
import {
    NftHeaderOptionSections,
    nftSettingsOpenAtom,
    useNftCardSpacing,
    useNftOriginalLinkPlacement,
} from '@components/account/nft-header-options';
import { NftHeaderVariantSection, useNftHeaderVariant } from '@components/account/nft-header-variant';
import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { useAtom, useAtomValue } from 'jotai';
import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { metadataProxyOverrideAtom } from '@/app/shared/lib/metadata-proxy-override';
import { DesignMenuSection, DesignMenuSwitch } from '@/app/shared/ui/design-menu';

// REVIEW(HOO-921): what this task's review compares. The menu shell around it is task-independent; a client module,
// because the sections read client-only state and the server layout must not import them.

// A `design` link's choices replace the stored ones as this module loads, before the menu and the header read them.
applyDesignLink();

/** The design menu's content for HOO-921. */
export function DesignMenuSections() {
    return (
        <>
            <NftHeaderVariantSection />
            <MetadataProxySection />
            <SettingsSpoiler>
                <NftHeaderOptionSections />
                <NftCreatorsVariantSections />
                <CopyDesignLink />
            </SettingsSpoiler>
        </>
    );
}

// The finer choices fold away under "Settings", as in HOO-935's menu; the menu remembers whether they are open.
function SettingsSpoiler({ children }: { children: ReactNode }) {
    const [open, setOpen] = useAtom(nftSettingsOpenAtom);
    return (
        <>
            <button
                type="button"
                aria-expanded={open}
                className="flex items-center justify-between border-0 bg-transparent p-0 pt-1 text-xs text-neutral-200"
                onClick={() => setOpen(!open)}
            >
                Settings
                <ChevronDown
                    size={14}
                    className={cn('transition-transform duration-200', open ? 'rotate-180' : 'rotate-0')}
                />
            </button>
            {open && children}
        </>
    );
}

// Copies this page's address with every choice of the menu, so whoever opens it sees this design.
function CopyDesignLink() {
    const [copied, setCopied] = useState(false);
    const choices = [
        useNftHeaderVariant(),
        useNftOriginalLinkPlacement(),
        useNftCardSpacing(),
        useNftCreatorsPlacement(),
        useNftCreatorsUnverified(),
        useNftCreatorsShare(),
        useAtomValue(metadataProxyOverrideAtom) ? 'proxy' : 'bypass',
    ];
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => {
                void navigator.clipboard.writeText(designLinkHref(choices, window.location.href)).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                });
            }}
        >
            {copied ? 'Copied' : 'Copy link to this design'}
        </Button>
    );
}

function MetadataProxySection() {
    const [override, setOverride] = useAtom(metadataProxyOverrideAtom);
    return (
        <DesignMenuSection title="Metadata">
            <DesignMenuSwitch
                label="Bypass the proxy"
                checked={!override}
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
