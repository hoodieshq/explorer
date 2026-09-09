'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@components/shared/ui/dropdown-menu';
import { cn } from '@components/shared/utils';
import Link from 'next/link';
import React, { type ReactNode } from 'react';
import { Menu } from 'react-feather';

import { ExternalLink } from '@/app/components/shared/ui/external-link';

import {
    EXPLORER_REPO_URL,
    FILLED_CONTROL_CLASSES,
    FOCUS_RULE_CLASSES,
    focusRuleStyle,
    GitHubMark,
    isKeyboardFocus,
    type NavRoute,
    OUTLINED_CONTROL_CLASSES,
} from './shared';

/**
 * The menu, as two components: the segmented group of destinations for
 * the wide bar, and the menu button with an anchored dropdown for the narrow one. Which is shown when is
 * the caller's (`className` carries the `hidden lg:flex` / `lg:hidden`), since the threshold is part of a
 * variant's layout, not of the menu.
 */

/** Feature Gates | Inspector | repo glyph in one outlined group, the active segment filled. 38px by
 *  construction (1 + 3 + 30 + 3 + 1), level with the field and the controls. `children` are appended as
 *  further segments. */
export function NavGroup({
    children,
    className,
    routes,
}: {
    children?: ReactNode;
    className?: string;
    routes: NavRoute[];
}) {
    return (
        <ul
            className={cn(
                'm-0 flex h-[38px] shrink-0 list-none items-center gap-0.5 rounded-md border border-solid border-outer-space-700 bg-heavy-metal-800 p-[3px]',
                className,
            )}
        >
            {routes.map(route => (
                <li key={route.id}>
                    <Link
                        href={route.href}
                        aria-current={route.active ? 'page' : undefined}
                        className={cn(
                            'flex h-[30px] items-center whitespace-nowrap rounded px-3.5 text-sm no-underline transition-colors',
                            route.active ? 'bg-heavy-metal-700 text-white' : 'text-outer-space-300 hover:text-white',
                        )}
                    >
                        {route.label}
                    </Link>
                </li>
            ))}
            <li>
                <ExternalLink
                    aria-label="Explorer repo"
                    href={EXPLORER_REPO_URL}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded text-outer-space-300 transition-colors hover:text-white"
                >
                    <GitHubMark className="h-[18px] w-[18px]" />
                </ExternalLink>
            </li>
            {children}
        </ul>
    );
}

/** The destinations as plain text links — no plate, no fill — with the repo glyph after them. For the bars
 *  where a framed group would be one outline too many. `children` are appended as further items. */
export function NavLinks({
    children,
    className,
    routes,
}: {
    children?: ReactNode;
    className?: string;
    routes: NavRoute[];
}) {
    return (
        <ul className={cn('m-0 flex list-none items-center gap-1 p-0', className)}>
            {routes.map(route => (
                <li key={route.id}>
                    <Link
                        href={route.href}
                        aria-current={route.active ? 'page' : undefined}
                        className={cn(
                            'block whitespace-nowrap px-2 py-2.5 text-sm no-underline transition-colors',
                            route.active ? 'text-white' : 'text-outer-space-300 hover:text-white',
                        )}
                    >
                        {route.label}
                    </Link>
                </li>
            ))}
            <li>
                <ExternalLink
                    aria-label="Explorer repo"
                    href={EXPLORER_REPO_URL}
                    className="flex items-center px-2 text-outer-space-300 transition-colors hover:text-white"
                >
                    <GitHubMark className="h-[18px] w-[18px]" />
                </ExternalLink>
            </li>
            {children}
        </ul>
    );
}

/** The menu button and its anchored dropdown: the destinations, a rule, the repo link. Controlled when the
 *  bar wants it mutually exclusive with its other overlays; otherwise Radix owns the state. `quiet` drops
 *  the button's outline — a glyph with a hover ground, for a bar whose controls are text on a ground.
 *  `filled` keeps the outline but puts the field's fill behind it, for a bar whose controls are filled. */
export function NavMenu({
    className,
    filled,
    onOpenChange,
    open,
    quiet,
    routes,
}: {
    className?: string;
    filled?: boolean;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    quiet?: boolean;
    routes: NavRoute[];
}) {
    // Only for the rule below: a keyboard focus lights it, and so does the menu being up.
    const [focused, setFocused] = React.useState(false);

    return (
        <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Open navigation"
                    // The field's focus rule, for a filled button: the two stand side by side on the phone
                    // row, and one lighting up differently from the other reads as two kinds of control.
                    style={filled ? focusRuleStyle(focused || Boolean(open)) : undefined}
                    onFocus={event => setFocused(isKeyboardFocus(event.currentTarget))}
                    onBlur={() => setFocused(false)}
                    className={cn(
                        quiet
                            ? 'flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-white transition-colors hover:bg-outer-space-800 data-[state=open]:bg-outer-space-800'
                            : cn(
                                  filled ? FILLED_CONTROL_CLASSES : OUTLINED_CONTROL_CLASSES,
                                  filled ? FOCUS_RULE_CLASSES : 'data-[state=open]:border-outer-space-500',
                              ),
                        className,
                    )}
                >
                    <Menu size={18} aria-hidden />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-56 p-1.5">
                {routes.map(route => (
                    <DropdownMenuItem key={route.id} asChild>
                        <Link
                            href={route.href}
                            aria-current={route.active ? 'page' : undefined}
                            className={cn(
                                'cursor-pointer px-3 py-2 no-underline',
                                route.active ? 'text-white' : 'text-outer-space-300',
                            )}
                        >
                            {route.label}
                            {route.active && (
                                <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-[#1dd79b]" />
                            )}
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <ExternalLink
                        href={EXPLORER_REPO_URL}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-outer-space-300 no-underline"
                    >
                        <GitHubMark className="h-4 w-4" />
                        Explorer repo
                    </ExternalLink>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
