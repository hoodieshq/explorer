import {
    PLACEMENT_STORAGE_KEY,
    PLACEMENT_VARIANTS,
    SHARE_STORAGE_KEY,
    SHARE_VARIANTS,
    UNVERIFIED_STORAGE_KEY,
    UNVERIFIED_VARIANTS,
} from '@components/account/nft-creators-variant';
import {
    CARD_SPACING_STORAGE_KEY,
    CARD_SPACING_VARIANTS,
    ORIGINAL_LINK_STORAGE_KEY,
    ORIGINAL_LINK_VARIANTS,
} from '@components/account/nft-header-options';
import { NFT_HEADER_STORAGE_KEY, NFT_HEADER_VARIANTS } from '@components/account/nft-header-variant';

import { METADATA_PROXY_STORAGE_KEY } from '@/app/shared/lib/metadata-proxy-override';

// REVIEW(HOO-921): a link that carries the design menu's choices, so a reviewer sees the design they were sent rather
// than what their browser remembers. Remove with the menu.

export const DESIGN_LINK_PARAM = 'design';

/** Each part of the link, in order: the storage key it fills and the values it takes; `stored` maps one to storage. */
const PARTS: { key: string; values: readonly string[]; stored?: (value: string) => unknown }[] = [
    { key: NFT_HEADER_STORAGE_KEY, values: NFT_HEADER_VARIANTS.map(variant => variant.value) },
    { key: ORIGINAL_LINK_STORAGE_KEY, values: ORIGINAL_LINK_VARIANTS.map(variant => variant.value) },
    { key: CARD_SPACING_STORAGE_KEY, values: CARD_SPACING_VARIANTS.map(variant => variant.value) },
    { key: PLACEMENT_STORAGE_KEY, values: PLACEMENT_VARIANTS.map(variant => variant.value) },
    { key: UNVERIFIED_STORAGE_KEY, values: UNVERIFIED_VARIANTS.map(variant => variant.value) },
    { key: SHARE_STORAGE_KEY, values: SHARE_VARIANTS.map(variant => variant.value) },
    // The override stores whether metadata goes through the proxy.
    { key: METADATA_PROXY_STORAGE_KEY, stored: value => value === 'proxy', values: ['bypass', 'proxy'] },
];

/** The current page's address with the given choices, one per part of `PARTS`, as the `design` parameter. */
export function designLinkHref(choices: readonly string[], href: string): string {
    const url = new URL(href);
    url.searchParams.set(DESIGN_LINK_PARAM, choices.join('.'));
    return url.toString();
}

/**
 * Writes a `design` link's choices over what the browser stored, then takes the parameter off the address, so the
 * menu's later picks hold on a reload. A part that isn't one of its values is skipped. Runs before the menu and the
 * header read their storage (they read it once mounted), so the page opens on the linked design.
 */
export function applyDesignLink(): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const link = url.searchParams.get(DESIGN_LINK_PARAM);
    if (link === null) return;

    link.split('.').forEach((value, index) => {
        const part = PARTS[index];
        if (!part?.values.includes(value)) return;
        try {
            window.localStorage.setItem(part.key, JSON.stringify(part.stored ? part.stored(value) : value));
        } catch {
            // Storage can be off (a private window); the page then shows the defaults.
        }
    });

    url.searchParams.delete(DESIGN_LINK_PARAM);
    window.history.replaceState(window.history.state, '', url.toString());
}
