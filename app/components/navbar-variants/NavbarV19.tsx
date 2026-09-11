'use client';

import { NavbarV17 } from './NavbarV17';
import type { INavbarProps } from './types';

/**
 * Variant 3.5 — v3.3's bar again, with the third switcher inside the popover
 * (`ClusterCustomLastBody`): shipping clusters, then your own saved endpoints, then Custom at the foot,
 * which unfolds the field only when it is chosen.
 *
 * A delegation and not a copy, for the reason `NavbarV18` gives: the bar is not what is under review, and
 * a third copy of its grid arithmetic would drift from the other two.
 */
export function NavbarV19({ children }: INavbarProps) {
    return <NavbarV17 clusterBody="custom-last">{children}</NavbarV17>;
}
