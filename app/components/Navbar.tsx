'use client';

import { cn } from '@components/shared/utils';
import { ClusterStatusButton } from '@features/cluster-switcher';
import Logo from '@img/logos-solana/dark-explorer-logo.svg';
import { useDisclosure } from '@mantine/hooks';
import { useClusterPath } from '@utils/url';
import Image from 'next/image';
import Link from 'next/link';
import { useSelectedLayoutSegment, useSelectedLayoutSegments } from 'next/navigation';
import React, { ReactNode } from 'react';
import { Menu } from 'react-feather';

import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { NavbarItem, NavbarLink, NavbarList } from '@/app/shared/ui/Navbar';

export interface INavbarProps {
    children?: ReactNode;
}

export function Navbar({ children }: INavbarProps) {
    const [navOpened, navHandlers] = useDisclosure(false);
    const homePath = useClusterPath({ pathname: '/' });
    const featureGatesPath = useClusterPath({ pathname: '/feature-gates' });
    const inspectorPath = useClusterPath({ pathname: '/tx/inspector' });
    const selectedLayoutSegment = useSelectedLayoutSegment();
    const selectedLayoutSegments = useSelectedLayoutSegments();

    return (
        <nav className="flex flex-wrap items-center border-0 border-b border-solid border-outer-space-800 bg-heavy-metal-850 py-3 text-white">
            <div
                // Fluid, full-width bar: no max-width cap, with the transaction page's side gutters (px-4 / lg:px-6).
                // `relative` anchors the mobile-centred logo lockup.
                className="relative flex w-full flex-wrap items-center justify-between px-4 lg:px-6"
            >
                {/* Burger — mobile only, sits at the left edge (DOM-first so it is the left flow item below lg). */}
                <button
                    type="button"
                    aria-label="Toggle navigation"
                    onClick={navHandlers.toggle}
                    className="rounded-md border border-solid border-transparent bg-transparent px-0 py-1 text-dark-muted-foreground lg:hidden"
                >
                    <Menu size={24} aria-hidden />
                </button>

                {/* Brand lockup: Solana mark over an "Explorer beta" caption. Absolutely centred below lg (burger
                    left / cluster right flank it); static and left-aligned from lg up. Kept short (mark 18px +
                    caption) so it never exceeds the cluster button, leaving the bar height unchanged. */}
                <Link
                    href={homePath}
                    className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none lg:static lg:translate-x-0 lg:translate-y-0 lg:items-start"
                >
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

                <div className="flex hidden h-full grow items-center pl-6 pr-2 xl:block" style={{ minWidth: 0 }}>
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
                        {/* Hidden until the MCP endpoint is announced; /mcp/start stays reachable by direct link.
                            The href is a plain path, not useClusterPath — the page documents a cluster-agnostic endpoint.
                        <NavbarItem>
                            <NavbarLink asChild active={selectedLayoutSegment === 'mcp'}>
                                <Link href="/mcp/start">MCP</Link>
                            </NavbarLink>
                        </NavbarItem> */}
                        <NavbarItem>
                            <NavbarLink
                                asChild
                                active={
                                    selectedLayoutSegments[0] === 'tx' && selectedLayoutSegments[1] === '(inspector)'
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
                                <svg viewBox="0 0 98 98" className="h-[18px] w-[18px] shrink-0 lg:h-[30px] lg:w-[30px]" xmlns="http://www.w3.org/2000/svg">
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

                {/* Network selector — now top-right on every breakpoint (was desktop-only `lg:block`). */}
                <div className="ml-[3px] block max-w-[210px] shrink-0">
                    <ClusterStatusButton />
                </div>
            </div>
        </nav>
    );
}
