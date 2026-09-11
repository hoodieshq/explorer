'use client';

import { NavbarV17 } from './NavbarV17';
import type { INavbarProps } from './types';

/**
 * Variant 3.4 — v3.3's bar exactly, with the cluster switcher rebuilt inside the popover: the shipping
 * clusters, then a line offering an endpoint of your own, then that field standing open with its
 * connection stated underneath and the saved endpoints listed below it as things to load into it
 * (`ClusterFieldFirstBody`).
 *
 * A delegation and not a copy: the bar is not what is under review here, and a second copy of 200 lines
 * of grid arithmetic would drift from v3.3 the first time either was touched — at which point the review
 * would be comparing two bars as well as two switchers.
 */
export function NavbarV18({ children }: INavbarProps) {
    return <NavbarV17 clusterBody="field-first">{children}</NavbarV17>;
}
