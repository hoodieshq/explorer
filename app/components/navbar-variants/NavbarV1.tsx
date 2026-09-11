'use client';

import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { ClusterStatusButton } from '@features/cluster-switcher';
import Logo from '@img/logos-solana/dark-explorer-logo.svg';
import { useDisclosure } from '@mantine/hooks';
import { useClusterPath } from '@utils/url';
import Image from 'next/image';
import Link from 'next/link';
import { useSelectedLayoutSegment, useSelectedLayoutSegments } from 'next/navigation';
import React from 'react';
import { Menu } from 'react-feather';

import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { NavbarItem, NavbarLink, NavbarList } from '@/app/shared/ui/Navbar';

import type { INavbarProps } from './types';

export function NavbarV1({ children }: INavbarProps) {
    const [navOpened, navHandlers] = useDisclosure(false);
    const homePath = useClusterPath({ pathname: '/' });
    const featureGatesPath = useClusterPath({ pathname: '/feature-gates' });
    const inspectorPath = useClusterPath({ pathname: '/tx/inspector' });
    const selectedLayoutSegment = useSelectedLayoutSegment();
    const selectedLayoutSegments = useSelectedLayoutSegments();

    return (
        <>
            <nav className="flex flex-wrap items-center border-0 border-b border-solid border-outer-space-800 bg-heavy-metal-850 py-3 text-white">
                <div
                    // Fluid, full-width bar: no max-width cap, with the transaction page's side gutters (px-4 / lg:px-6).
                    // `relative` anchors the burger drawer, which drops from `top-full`.
                    className="relative flex w-full flex-wrap items-center justify-between px-4 lg:px-6"
                >
                    {/* Brand lockup: Solana mark over an "Explorer beta" caption, hard left at every width — the
                    whole point of this variant. No `flex-1`, so it takes its natural width and the right-hand
                    controls are pushed out by the parent's `justify-between` (below lg) or by the search
                    box's `grow` (lg and up). */}
                    <Link href={homePath} className="flex min-w-0 shrink-0 flex-col items-start leading-none">
                        {/* The asset is the combined "Solana Explorer" wordmark; crop off the right "Explorer" half
                        (gray group at viewBox x≥431 ≈ 120px of 214) so it is not duplicated by the caption below.
                        `max-w-none` keeps the img at its natural 214px inside the narrower clip. */}
                        <span className="block overflow-hidden" style={{ width: 112 }}>
                            <Image alt="Solana" height={22} src={Logo} width={214} priority className="max-w-none" />
                        </span>
                        <span className="ml-[8px] mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#b4b4b4]">
                            Explorer (beta)
                        </span>
                    </Link>

                    {/* `flex-1` (flex: 1 1 0%), not `grow` (flex-grow: 1 with basis auto). With `flex-wrap` the
                    browser decides line breaks from base sizes and only shrinks *within* a line, so a
                    basis of `auto` — here the intrinsic width of an `<input>` — pushed the cluster button
                    and burger onto a second row instead of letting the field give way. A basis of 0 takes
                    the field out of that decision: it absorbs whatever is left over and nothing wraps.
                    `minWidth: 0` lets it shrink past its content's min-content width.

                    Deliberately no `min-w-*` floor: a floor is exactly what would bring the wrap back at
                    the narrowest width where the field is in the bar. `flex-wrap` stays as the safety
                    net — wrapping is a better failure than horizontal page scroll. */}
                    <div className="hidden h-full flex-1 items-center pl-6 pr-2 sm:block" style={{ minWidth: 0 }}>
                        {children}
                    </div>

                    <div
                        className={cn(
                            // Desktop (lg+): inline row pushed to the right. Below lg the burger opens this as an
                            // overlay panel dropping below the bar — absolute, so it covers page content instead of
                            // pushing it down. `navOpened` survives a resize past lg where the toggle is gone.
                            'lg:static lg:ml-auto lg:flex lg:w-auto lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none',
                            navOpened
                                ? 'absolute inset-x-0 top-full z-50 flex w-full flex-col border-0 border-b border-solid border-outer-space-800 bg-heavy-metal-850 px-4 py-2 shadow-dk-card'
                                : 'hidden',
                        )}
                    >
                        <NavbarList className="mr-auto w-full flex-col gap-1 lg:w-auto lg:flex-row lg:gap-0">
                            <NavbarItem>
                                <NavbarLink asChild active={selectedLayoutSegment === 'feature-gates'}>
                                    <Link href={featureGatesPath}>Feature Gates</Link>
                                </NavbarLink>
                            </NavbarItem>
                            {/* A plain path, not useClusterPath — the page documents a cluster-agnostic endpoint. */}
                            <NavbarItem>
                                <NavbarLink asChild active={selectedLayoutSegment === 'mcp'}>
                                    <Link href="/mcp/docs">MCP</Link>
                                </NavbarLink>
                            </NavbarItem>
                            <NavbarItem>
                                <NavbarLink
                                    asChild
                                    active={
                                        selectedLayoutSegments[0] === 'tx' &&
                                        selectedLayoutSegments[1] === '(inspector)'
                                    }
                                >
                                    <Link href={inspectorPath}>Inspector</Link>
                                </NavbarLink>
                            </NavbarItem>
                            {/* Centred only in the lg row; the drawer stacks vertically, where centring breaks the left edge the text links share. */}
                            <NavbarItem className="flex items-center lg:justify-center">
                                <ExternalLink
                                    aria-label="Explorer repo"
                                    href="https://github.com/solana-foundation/explorer"
                                    // Drawer: smaller icon + "Explorer repo" label, aligned to the text links' left edge
                                    // (px-2 py-2.5). From lg it collapses to the icon only, centred in the row.
                                    className="flex items-center gap-2 px-2 py-2.5 text-dk-gray-700 hover:text-dk-white lg:mx-3 lg:px-0 lg:py-0 lg:text-white"
                                >
                                    <svg
                                        viewBox="0 0 98 98"
                                        className="h-[18px] w-[18px] shrink-0 lg:h-[30px] lg:w-[30px]"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span className="lg:hidden">Explorer repo</span>
                                </ExternalLink>
                            </NavbarItem>
                        </NavbarList>
                    </div>

                    {/* Network selector and burger travel together on the right. The burger is DOM-last so it
                    is the rightmost flow item below lg, mirroring the shipped bar, where it is DOM-first on the left. */}
                    <div className="ml-[3px] flex min-w-0 items-center gap-2">
                        {/* The cap, not `shrink`, is what keeps this on one row. At 321px the bar has a
                            289px content box and the logo (112) plus this group's natural 191 do not fit —
                            and with `flex-wrap` the browser breaks the line from *base* sizes, shrinking
                            only within a line afterwards, so making the group shrinkable changed nothing.
                            A `max-width` does lower the base size: capped at 120px below `xs`, the group
                            comes to ~170 and the row holds. The button truncates, so the cost is a few
                            characters of the network name instead of a second row. From `xs` up there is
                            room for the full 210. */}
                        {/* The search field is a hard `h-[38px]`, while a dashkit button computes to 40.5 (py-2 +
                            22.5px line box + 2px border) — the couple of pixels that made the controls look
                            mismatched. 38 is the deliberate number (the search skeleton uses it too), so the
                            buttons come down to it. Forced on the child because `ClusterStatusButton` takes no
                            className, and `!important` rather than a plain utility because both would land at
                            the same specificity and stylesheet order would pick the winner. */}
                        <div className="block min-w-0 max-w-[120px] xs:max-w-[210px] [&>*]:!inline-flex [&>*]:!h-[38px] [&>*]:!items-center [&>*]:!justify-center [&>*]:!py-0">
                            <ClusterStatusButton />
                        </div>
                        {/* A real button, matched to the cluster selector's height by construction rather than a
                        tuned pixel value: same `Button`, same `ui`, same (default) size, so the two stay in
                        step if that scale ever moves. `white` is the neutral dark-surface variant, keeping
                        the burger subordinate to the primary-green selector beside it.

                        The icon is 18px, not the 24px of variant 1: the dashkit default size sets a 22.5px
                        line box (0.9375rem × 1.5), and a 24px glyph would push this button taller than the
                        selector — the one thing it must not do. */}
                        <Button
                            ui="dashkit"
                            variant="white"
                            type="button"
                            aria-label="Toggle navigation"
                            onClick={navHandlers.toggle}
                            className="!h-[38px] shrink-0 !py-0 lg:hidden"
                        >
                            <Menu size={18} aria-hidden />
                        </Button>
                    </div>
                </div>
            </nav>

            {/* From sm the search sits in the bar as it does on desktop, while the nav links stay in the burger
            until lg; only below sm does the field drop under the bar.
            Owned by the variant, not the layout: the shipped bar and this one move the field into the bar at
            different widths, so a single copy in `layout.tsx` could not serve both. Rendered after
            `</nav>` so it stays below the bar's bottom border, exactly where the layout had it.
            Full-bleed with the bar's own px-4 gutters — `PageContainer` used to cap it at 540/720px
            and centre it, leaving the field narrower than the bar above it. */}
            <div className="my-3 w-full px-4 sm:hidden">{children}</div>
        </>
    );
}
