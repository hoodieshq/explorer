import { METADATA_PROXY_STORAGE_KEY } from '@/app/shared/lib/metadata-proxy-override';
import {
    CARD_SPACING_STORAGE_KEY,
    CARD_SPACING_VARIANTS,
    ORIGINAL_LINK_STORAGE_KEY,
    ORIGINAL_LINK_VARIANTS,
} from '@/app/shared/lib/nftoken-header-options';
import { NFTOKEN_HEADER_STORAGE_KEY, NFTOKEN_HEADER_VARIANTS } from '@/app/shared/lib/nftoken-header-variant';

// REVIEW(HOO-929): a link that carries the design menu's choices, so a reviewer sees the design they were sent rather
// than what their browser remembers (HOO-921's menu has the same). Remove with the menu.

export const DESIGN_LINK_PARAM = 'design';

/** Each part of the link, in order: the storage key it fills and the values it takes; `stored` maps one to storage. */
const PARTS: { key: string; values: readonly string[]; stored?: (value: string) => unknown }[] = [
    { key: NFTOKEN_HEADER_STORAGE_KEY, values: NFTOKEN_HEADER_VARIANTS.map(variant => variant.value) },
    { key: ORIGINAL_LINK_STORAGE_KEY, values: ORIGINAL_LINK_VARIANTS.map(variant => variant.value) },
    { key: CARD_SPACING_STORAGE_KEY, values: CARD_SPACING_VARIANTS.map(variant => variant.value) },
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
