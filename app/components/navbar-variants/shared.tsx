'use client';

import { cn } from '@components/shared/utils';
import Logo from '@img/logos-solana/dark-explorer-logo.svg';
import { useClusterPath } from '@utils/url';
import Image from 'next/image';
import Link from 'next/link';
import { useSelectedLayoutSegment, useSelectedLayoutSegments } from 'next/navigation';
import React, { type CSSProperties } from 'react';

/**
 * Pieces the later variants share. The first two inline all of this; they predate the file and are left as
 * they are, since each of them is a frozen design under review, not a component to refactor.
 *
 * Nothing here decides *layout* — that is the whole difference between variants. What is shared is the
 * palette (one bar ground, one bottom rule, one text colour), the brand lockup, the two routes and the
 * GitHub mark, so a reviewer comparing variants is comparing arrangements and not accidental colour drift.
 */

export const EXPLORER_REPO_URL = 'https://github.com/solana-foundation/explorer';

/** The bar's ground, bottom rule and text colour — the same three tokens v1 ships with. */
export const BAR_CLASSES = 'border-0 border-b border-solid border-outer-space-800 bg-heavy-metal-850 text-white';

/** Side gutters matching the transaction page (px-4 / lg:px-6), as every variant before this one. */
export const GUTTER_CLASSES = 'px-4 lg:px-6';

/**
 * A 38px outlined square: the frame v3 introduced for its burger, reused for any icon control that sits
 * beside the 38px search field and cluster button. Transparent ground, `outer-space-700` rule, the same
 * radius as the field.
 */
const OUTLINED_CONTROL_BASE =
    'flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-solid border-outer-space-700 p-0 text-white transition-colors hover:border-outer-space-600';

export const OUTLINED_CONTROL_CLASSES = cn(OUTLINED_CONTROL_BASE, 'bg-transparent');

/** `bg-heavy-metal-800`, spelled out: the rule below has to paint the control's own fill back over its
 *  padding box, and a class cannot be read from a style object. */
const CONTROL_GROUND = 'oklch(30.098% 0.01205 160.58)';

/**
 * The search field's focus rule, for a control that stands beside it: the same graded green, brightest at
 * the bottom-left corner and all but gone by the far one, painted to the border box with the fill laid
 * back over the padding box so the corner radius survives — `border-image` would drop it.
 *
 * A background cannot be faded, so the light is *grown*: the gradient layer goes from no size to the whole
 * box, anchored at the corner it comes from. 100ms in, four times that out, as the field has it.
 *
 * Taken as a whole rather than as a class per state: an inline background-size would beat any utility, so
 * both halves of the switch have to come from here. `lit` covers focus *and* the open surface — tapping a
 * trigger hands the focus to what it opens, and the control it came from should not go dark while that is
 * up.
 */
export function focusRuleStyle(lit: boolean): CSSProperties {
    return {
        backgroundClip: 'padding-box, border-box',
        backgroundImage: [
            `linear-gradient(${CONTROL_GROUND}, ${CONTROL_GROUND})`,
            'radial-gradient(118% 130% at 0% 100%, rgba(29,215,155,0.53) 0%, rgba(29,215,155,0.46) 35%, rgba(29,215,155,0.4) 65%, rgba(29,215,155,0.34) 90%, rgba(29,215,155,0.31) 100%)',
        ].join(', '),
        backgroundOrigin: 'border-box',
        backgroundPosition: '0 0, left bottom',
        backgroundRepeat: 'no-repeat',
        backgroundSize: lit ? '100% 100%, 100% 100%' : '100% 100%, 0% 0%',
        borderColor: lit ? 'transparent' : undefined,
        transitionDuration: lit ? '100ms' : '400ms',
        transitionProperty: 'background-size, border-color',
    };
}

/** Goes with the rule: the browser's own focus ring would sit outside the one being drawn. */
export const FOCUS_RULE_CLASSES = 'focus-visible:outline-none';

/** True only for a focus the browser would have drawn a ring for — a tap should light the rule through
 *  the surface it opens, not through the focus the tap leaves behind. */
export function isKeyboardFocus(target: EventTarget & Element): boolean {
    return target.matches(':focus-visible');
}

/** The same control standing on the search field's fill instead of bare on the bar, for a variant whose
 *  other controls are filled — an outline on the bar beside a filled chip reads as two kinds of control.
 *  Spelled out as its own constant rather than a class appended by the caller: `cn` is plain clsx, so two
 *  background utilities in one list would leave stylesheet order to pick the winner. */
export const FILLED_CONTROL_CLASSES = cn(OUTLINED_CONTROL_BASE, 'bg-heavy-metal-800');

/**
 * Brand lockup: the Solana mark over an "Explorer (beta)" caption. Identical to v1's markup — the asset is
 * the combined "Solana Explorer" wordmark, so the right half (viewBox x≥431 ≈ 120px of 214) is cropped and
 * the caption says it instead. `max-w-none` keeps the img at its natural 214px inside the 112px clip.
 */
export function BrandLockup({ className }: { className?: string }) {
    const homePath = useClusterPath({ pathname: '/' });
    return (
        <Link href={homePath} className={cn('flex min-w-0 shrink-0 flex-col items-start leading-none', className)}>
            <span className="block overflow-hidden" style={{ width: 112 }}>
                <Image alt="Solana" height={22} src={Logo} width={214} priority className="max-w-none" />
            </span>
            <span className="ml-[8px] mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#b4b4b4]">
                Explorer (beta)
            </span>
        </Link>
    );
}

export interface NavRoute {
    active: boolean;
    href: string;
    id: 'feature-gates' | 'inspector' | 'mcp';
    label: string;
}

/**
 * The in-app destinations with their active state, in display order.
 */
export function useNavRoutes(): NavRoute[] {
    const featureGatesPath = useClusterPath({ pathname: '/feature-gates' });
    const inspectorPath = useClusterPath({ pathname: '/tx/inspector' });
    const segment = useSelectedLayoutSegment();
    const segments = useSelectedLayoutSegments();
    return [
        { active: segment === 'feature-gates', href: featureGatesPath, id: 'feature-gates', label: 'Feature Gates' },
        // A plain path, not `useClusterPath`: the page documents one cluster-agnostic endpoint, so a
        // `?cluster=` on it would describe a choice the endpoint does not offer.
        { active: segment === 'mcp', href: '/mcp/docs', id: 'mcp', label: 'MCP' },
        {
            active: segments[0] === 'tx' && segments[1] === '(inspector)',
            href: inspectorPath,
            id: 'inspector',
            label: 'Inspector',
        },
    ];
}

/** The GitHub mark v1 carries inline, as a sized `currentColor` glyph. */
export function GitHubMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 98 98" className={cn('shrink-0', className)} xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                fill="currentColor"
            />
        </svg>
    );
}
