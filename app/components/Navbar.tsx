'use client';

import { useAtomValue } from 'jotai';

import { NAV_VARIANTS_ENABLED } from './navbar-variants/nav-variant-storage';
import { NAV_VARIANTS, navVariantAtom, SHIPPING_NAV_VARIANT } from './navbar-variants/registry';
import type { INavbarProps } from './navbar-variants/types';

export type { INavbarProps };

/**
 * Entry point for the main navigation, kept at this path and name because the layout and the stories all
 * mount it. With variants disabled it is the shipping variant and nothing more — no atom, no storage
 * read, no extra render.
 *
 * Which variant that is comes from the registry's `DEFAULT_NAV_VARIANT`, not from its order: the numbering
 * is the review's and gets shuffled as variants are ranked or retired, while the layout that is actually
 * committed must not move with it. Naming it in one place also keeps it the same variant the switcher
 * starts on.
 */
export function Navbar(props: INavbarProps) {
    if (!NAV_VARIANTS_ENABLED) return <SHIPPING_NAV_VARIANT.Component {...props} />;
    return <SelectedNavbarVariant {...props} />;
}

// Split out so the hook is not called behind the flag check above. The flag is a module constant, but the
// hook still has to live where it runs unconditionally.
function SelectedNavbarVariant(props: INavbarProps) {
    const id = useAtomValue(navVariantAtom);
    // The stored id is already validated against the registry on read, so this only has to cover the gap
    // between a rename landing and storage being written again.
    const variant = NAV_VARIANTS.find(v => v.id === id) ?? NAV_VARIANTS[0];
    return <variant.Component {...props} />;
}
