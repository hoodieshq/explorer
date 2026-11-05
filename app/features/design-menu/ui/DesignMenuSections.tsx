'use client';

import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { metadataProxyOverrideAtom } from '@/app/shared/lib/metadata-proxy-override';
import {
    CARD_SPACING_VARIANTS,
    cardSpacingAtom,
    nftokenSettingsOpenAtom,
    ORIGINAL_LINK_VARIANTS,
    originalLinkPlacementAtom,
    useNftokenCardSpacing,
    useNftokenOriginalLinkPlacement,
} from '@/app/shared/lib/nftoken-header-options';
import {
    NFTOKEN_HEADER_VARIANTS,
    nftokenHeaderVariantAtom,
    useNftokenHeaderVariant,
} from '@/app/shared/lib/nftoken-header-variant';
import { DesignMenuOptions, DesignMenuSection, DesignMenuSwitch } from '@/app/shared/ui/design-menu';

import { applyDesignLink, designLinkHref } from '../lib/design-link';

// REVIEW(HOO-929): what this task's review compares. The menu shell around it is task-independent; a client module,
// because the sections read client-only state and the server layout must not import them.

// A `design` link's choices replace the stored ones as this module loads, before the menu and the header read them.
applyDesignLink();

/** The design menu's content for HOO-929. */
export function DesignMenuSections() {
    return (
        <>
            <NftokenHeaderVariantSection />
            <MetadataProxySection />
            <SettingsSpoiler>
                <NftokenHeaderOptionSections />
                <CopyDesignLink />
            </SettingsSpoiler>
        </>
    );
}

// The finer choices fold away under "Settings", as in HOO-921's and HOO-935's menus; the menu remembers whether they
// are open.
function SettingsSpoiler({ children }: { children: ReactNode }) {
    const [open, setOpen] = useAtom(nftokenSettingsOpenAtom);
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

function NftokenHeaderOptionSections() {
    const originalLink = useNftokenOriginalLinkPlacement();
    const cardSpacing = useNftokenCardSpacing();
    const setOriginalLink = useSetAtom(originalLinkPlacementAtom);
    const setCardSpacing = useSetAtom(cardSpacingAtom);
    return (
        <>
            <DesignMenuSection title="View original">
                <DesignMenuOptions options={ORIGINAL_LINK_VARIANTS} value={originalLink} onChange={setOriginalLink} />
            </DesignMenuSection>
            <DesignMenuSection title="Card text">
                <DesignMenuOptions options={CARD_SPACING_VARIANTS} value={cardSpacing} onChange={setCardSpacing} />
            </DesignMenuSection>
        </>
    );
}

// Copies this page's address with every choice of the menu, so whoever opens it sees this design.
function CopyDesignLink() {
    const [copied, setCopied] = useState(false);
    const choices = [
        useNftokenHeaderVariant(),
        useNftokenOriginalLinkPlacement(),
        useNftokenCardSpacing(),
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
