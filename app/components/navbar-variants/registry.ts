import type { ComponentType } from 'react';

import { createNavVariantAtom } from './nav-variant-storage';
import { NavbarV1 } from './NavbarV1';
import { NavbarV2 } from './NavbarV2';
import { NavbarV3 } from './NavbarV3';
import { NavbarV10 } from './NavbarV10';
import { NavbarV12 } from './NavbarV12';
import { NavbarV13 } from './NavbarV13';
import { NavbarV14 } from './NavbarV14';
import { NavbarV15 } from './NavbarV15';
import { NavbarV16 } from './NavbarV16';
import { NavbarV17 } from './NavbarV17';
import type { INavbarProps } from './types';

/**
 * The one place a design variant is added: drop a `NavbarV<n>.tsx` beside this file and list it here. The
 * switcher, the persisted-value validation and the dispatcher all read this list, so nothing else needs
 * touching.
 *
 * The order here is the order the switcher lists them in, and `id` is what storage holds. Both are the
 * review's, not the code's: a variant gets renumbered whenever the ranking changes, and an id like `v1.1`
 * says "a take on the same idea" in a way a serial number cannot — `v1.1` and `v1.2` are two readings of
 * one layout, `v4.1` and `v4.2` two of a bar whose controls carry no outlines. Filenames stay where
 * they are through all of that — a decimal is no kind of filename, and chasing every relabel through the
 * filesystem is churn for nothing. So `v1.1` lives in `NavbarV3.tsx`, and that is fine.
 *
 * `name` is what the switcher shows beside the id: two or three words for what the variant *does*
 * differently, since by the seventh entry the numbers stop meaning anything on their own.
 *
 * `shortlist` marks the ones still in the running. The switcher opens on those alone and its star opens
 * the rest, because a list of everything ever tried is for looking back through, not for choosing from.
 */
export const NAV_VARIANTS = [
    { Component: NavbarV1, id: 'v1.1', name: 'Fluid column', shortlist: true },
    { Component: NavbarV3, id: 'v1.2', name: 'Updated network selector', shortlist: false },
    { Component: NavbarV2, id: 'v2', name: 'Centred logo', shortlist: false },
    { Component: NavbarV10, id: 'v3.1', name: 'Search button on mobile', shortlist: false },
    { Component: NavbarV16, id: 'v3.2', name: 'Same, with the aurora', shortlist: true },
    { Component: NavbarV17, id: 'v3.3', name: 'Status spelled out', shortlist: true },
    { Component: NavbarV12, id: 'v4.1', name: 'Borderless', shortlist: false },
    { Component: NavbarV13, id: 'v4.2', name: 'Borderless alt', shortlist: false },
    { Component: NavbarV14, id: 'v5.1', name: 'Search and network joined', shortlist: true },
    { Component: NavbarV15, id: 'v5.2', name: 'Joined, glow behind', shortlist: false },
] as const satisfies readonly {
    Component: ComponentType<INavbarProps>;
    id: string;
    name: string;
    shortlist: boolean;
}[];

export type NavVariantId = (typeof NAV_VARIANTS)[number]['id'];

export const NAV_VARIANT_IDS = NAV_VARIANTS.map(v => v.id);

/**
 * The variant that ships: what `Navbar` renders with the review flag off, and where every unknown stored
 * id lands. Typed against the registry's own ids, so a renumbering that leaves it behind fails the build
 * — which is what should have happened when `v1` became `v1.1` and this went on naming a variant that no
 * longer existed.
 */
export const DEFAULT_NAV_VARIANT: NavVariantId = 'v3.3';

/** The entry for it, so the id and the rendered component cannot name two different variants. The `??` is
 *  unreachable — the id above is checked against this very list — but the lookup itself runs at runtime. */
export const SHIPPING_NAV_VARIANT = NAV_VARIANTS.find(v => v.id === DEFAULT_NAV_VARIANT) ?? NAV_VARIANTS[0];

export const navVariantAtom = createNavVariantAtom(NAV_VARIANT_IDS, DEFAULT_NAV_VARIANT);
