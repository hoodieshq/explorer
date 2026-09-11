'use client';

import { cn } from '@components/shared/utils';
import { useHotkeys } from '@mantine/hooks';
import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Search, X } from 'react-feather';

import { ClusterDropdown } from './ClusterDropdown';
import { STRIP_SEARCH_FRAME_CLASSES } from './MorphSearch';
import { NavLinks, NavMenu } from './NavGroup';
import { BAR_CLASSES, BrandLockup, GUTTER_CLASSES, useNavRoutes } from './shared';
import type { INavbarProps } from './types';

/**
 * Variant 4.2 — v4.1's row, with the field opening *between* the brand and the group, as a line of input in
 * the bar itself, and the destinations moved to the end of the row. From lg the row at rest is brand …
 * 🔍 · | · ● network · | · Feature Gates · Inspector · repo; below lg, brand … 🔍 · | · ● network · | · ≡.
 * The links being last, nothing ever has to make way for the field or be covered by it.
 *
 * The field is a flow item between the brand and the group, zero-width at rest; tapping the lens grows it
 * (`flex-grow` 0 → 1) into the slack, so the order is brand · field · ✕ · | · network · | · links, the cross
 * right after the field. Below lg there is no slack beside the brand, so the brand folds while the field is
 * out and the field runs from the gutter to the cross; the network and the menu stay put.
 *
 * The field has no frame — no rule around it, no ground of its own — only, from lg, the same hairline the
 * row uses between its items, at its left edge where it meets the brand; the lens the search draws, the
 * placeholder and the caret sit on the bar.
 * The lens in the group turns into the cross in place, and is what closes the field; so does Escape.
 *
 * The field is the shipping `SearchBar` (the bar's `children`), mounted once, its own frame stripped
 * since the bar is the frame. The `/` hint is hidden (the cross takes that end). Closed, the input is
 * `inert` — out of the tab order and unfocusable — rather than `visibility: hidden`: the caret has to land
 * in it *inside* the tap that opens it (iOS raises the keyboard only for a focus within the gesture), so
 * the open handler flushes the render synchronously and focuses, and a hidden input would refuse.
 */
export function NavbarV13({ children }: INavbarProps) {
    const [searchOpened, setSearchOpened] = useState(false);
    const [clusterOpened, setClusterOpened] = useState(false);
    const [menuOpened, setMenuOpened] = useState(false);
    const routes = useNavRoutes();
    const fieldRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const wasOpened = useRef(false);

    // Focus goes back onto the lens when the field folds, so a keyboard user is not dropped on `<body>`.
    useEffect(() => {
        if (!searchOpened && wasOpened.current) toggleRef.current?.focus();
        wasOpened.current = searchOpened;
    }, [searchOpened]);

    // One thing open at a time. Opening flushes the render before focusing: the input is `inert` until the
    // state lands in the DOM, and the focus has to happen inside the gesture that opened the field.
    const onSearchOpenChange = (open: boolean) => {
        if (open) {
            flushSync(() => {
                setMenuOpened(false);
                setClusterOpened(false);
                setSearchOpened(true);
            });
            fieldRef.current?.querySelector('input')?.focus();
            return;
        }
        setSearchOpened(false);
    };
    const onClusterOpenChange = (open: boolean) => {
        if (open) {
            setMenuOpened(false);
            setSearchOpened(false);
        }
        setClusterOpened(open);
    };
    const onMenuOpenChange = (open: boolean) => {
        if (open) {
            setClusterOpened(false);
            setSearchOpened(false);
        }
        setMenuOpened(open);
    };

    useHotkeys(
        [
            ['/', () => onSearchOpenChange(true)],
            ['mod+k', () => onSearchOpenChange(true)],
        ],
        ['INPUT', 'TEXTAREA'],
    );

    return (
        <nav className={cn('py-3', BAR_CLASSES)}>
            <div className={cn('flex items-center gap-1.5 xs:gap-2', GUTTER_CLASSES)}>
                {/* Brand. Folds below lg while the field is out — there is no room beside it on a phone — and
                    stays from lg, where the link row folds instead. 112 is the lockup's own width. */}
                <div
                    className={cn(
                        'flex shrink-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none',
                        'lg:max-w-none lg:opacity-100',
                        searchOpened ? 'max-w-0 opacity-0' : 'max-w-[112px] opacity-100',
                    )}
                >
                    <BrandLockup />
                </div>

                {/* The field: a flow item on a zero basis, `grow` when open. Closed it is zero-wide and pulls
                    the row's gap back with a negative margin, so it costs the rest layout nothing (the
                    320px row is full already). Open, from lg, the row's hairline rides its left edge. */}
                <div
                    ref={fieldRef}
                    onKeyDown={event => {
                        if (event.key === 'Escape') onSearchOpenChange(false);
                    }}
                    onBlur={event => {
                        // Same rule as the other bars: an open field with nothing in it folds away when
                        // the caret leaves, one with a search in it stays.
                        if (event.currentTarget.contains(event.relatedTarget)) return;
                        if (searchOpened && !fieldRef.current?.querySelector('input')?.value) {
                            setSearchOpened(false);
                        }
                    }}
                    className={cn(
                        'flex min-w-0 basis-0 items-center overflow-hidden',
                        'transition-[flex-grow,margin,opacity] duration-300 ease-out motion-reduce:transition-none',
                        searchOpened ? 'ml-0 grow opacity-100' : '-ml-1.5 grow-0 opacity-0 xs:-ml-2',
                    )}
                >
                    <span aria-hidden className="mx-1 hidden h-4 w-px shrink-0 bg-outer-space-700 lg:block" />
                    <div
                        inert={!searchOpened}
                        className={cn(
                            'min-w-0 flex-1',
                            STRIP_SEARCH_FRAME_CLASSES,
                            '[&_[cmdk-root]>div]:!pr-1 [&_kbd]:hidden',
                        )}
                    >
                        {children}
                    </div>
                </div>

                {/* Right-hand group: lens · | · network · | · links (from lg) or menu (below). The cross is
                    the first thing after the field at every width. Below lg the arithmetic is v4.1's
                    (network 68 / 112 / 150 by screen). */}
                <div className="ml-auto flex shrink-0 items-center gap-1.5 xs:gap-2">
                    {/* Lens at rest, cross while the field is out; the same 38px glyph either way. */}
                    <button
                        ref={toggleRef}
                        type="button"
                        aria-label={searchOpened ? 'Close search' : 'Open search'}
                        aria-expanded={searchOpened}
                        onClick={() => onSearchOpenChange(!searchOpened)}
                        className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-white transition-colors hover:bg-outer-space-800"
                    >
                        <span className="relative block h-[18px] w-[18px]">
                            <Search
                                size={18}
                                aria-hidden
                                className={cn(
                                    'absolute inset-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none',
                                    searchOpened ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100',
                                )}
                            />
                            <X
                                size={18}
                                aria-hidden
                                className={cn(
                                    'absolute inset-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none',
                                    searchOpened ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0',
                                )}
                            />
                        </span>
                    </button>

                    <span aria-hidden className="h-4 w-px shrink-0 bg-outer-space-700 lg:mx-1" />
                    <ClusterDropdown
                        shape="text"
                        align="end"
                        open={clusterOpened}
                        onOpenChange={onClusterOpenChange}
                        className="max-w-[68px] xs:max-w-[112px] sm:max-w-[170px] lg:max-w-[240px]"
                    />

                    <span aria-hidden className="h-4 w-px shrink-0 bg-outer-space-700 lg:mx-1" />
                    <NavLinks routes={routes} className="hidden lg:flex" />
                    <NavMenu
                        quiet
                        routes={routes}
                        open={menuOpened}
                        onOpenChange={onMenuOpenChange}
                        className="lg:hidden"
                    />
                </div>
            </div>
        </nav>
    );
}
