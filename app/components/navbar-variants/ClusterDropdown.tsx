'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import { cn } from '@components/shared/utils';
import { clusterModalOpenAtom, useCluster } from '@entities/cluster';
import { Cluster, clusterSlug, ClusterStatus } from '@utils/cluster';
import { useAtomValue, useSetAtom } from 'jotai';
import { useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { ChevronDown } from 'react-feather';

import { ClusterCustomLastBody } from './ClusterCustomLastBody';
import {
    ClusterDropdownBody,
    ClusterFacts,
    ClusterProvenance,
    endpointName,
    RPC_STYLE,
    STATUS_STYLE,
} from './ClusterDropdownBody';
import { ClusterFieldFirstBody } from './ClusterFieldFirstBody';
import { endpointProvenance } from './endpoint-provenance';
import { ICON_SETS, iconSetAtom } from './icon-sets';
import { FOCUS_RULE_CLASSES, focusRuleStyle, isKeyboardFocus } from './shared';

/**
 * The network selector as a dropdown, for every variant past the first two: the switcher opens in place under its
 * trigger — a popover holding `ClusterDropdownBody`, the switcher laid out as a menu — instead of sliding
 * a panel in from the right edge. The network name is always on the trigger; the shapes differ in what
 * else is, and in what frame the trigger borrows:
 *
 * - `stacked` — v3's control: network name with a chevron, the status spelled out beneath, in its own
 *   outline. Width is the caller's (`w-*` in `className`), since each bar has its own arithmetic.
 * - `stacked-lead` — the same two lines, dealt differently: the provenance mark leads the network's name
 *   on the first, and the second is the connection's mark and its status written out as a phrase rather
 *   than in the caption's small caps. Says the same two things, louder and in fewer pieces.
 * - `compact` — one line, status dot · name · chevron, in its own outline with the buttons' radius. Reads
 *   as a context tag, for sitting next to the brand.
 * - `prefix` — the same line as the left segment of a shared frame (a search field's): no outline of its
 *   own, a rule on its right. Says "search *on this network*".
 * - `suffix-stacked` — the same idea at the *other* end of a shared frame: a rule on its left, the status
 *   spelled out under the name as `stacked` has it, for a bar that wants the connection stated in words
 *   rather than left to the dot's hue.
 * - `text` — the line styled like a text link, for sitting among the destinations.
 *
 * Colour is reserved for status, as in v3: the trigger frame is a plain outline and only the dot (or the
 * status line) carries a hue, so the network name is read on the bar's ground rather than on a green or
 * magenta field.
 *
 * `open` / `onOpenChange` are optional: a bar that also has a collapsing search wants the two mutually
 * exclusive and drives both from its own state; the others let Radix own it.
 */

export type ClusterDropdownShape = 'compact' | 'prefix' | 'stacked' | 'stacked-lead' | 'suffix-stacked' | 'text';

/**
 * Which switcher hangs off the trigger. `menu` is the row-per-choice one every variant up to v3.3 opens;
 * `field-first` is v3.4's, where the endpoint field is always up and the saved list feeds it
 * (`ClusterFieldFirstBody`); `custom-last` is v3.5's, where your own endpoints come second and Custom
 * sits at the foot and unfolds the field (`ClusterCustomLastBody`). The trigger is identical in all
 * three — the variants differ inside the popover, not on the bar.
 */
export type ClusterDropdownBodyKind = 'custom-last' | 'field-first' | 'menu';

const TRIGGER_CLASSES: Record<ClusterDropdownShape, string> = {
    compact:
        'flex h-[38px] cursor-pointer items-center gap-2 rounded-md border border-solid border-outer-space-700 bg-transparent px-3 text-left text-sm leading-none text-white transition-colors hover:border-outer-space-600 data-[state=open]:border-outer-space-500',
    prefix: 'flex h-full shrink-0 cursor-pointer items-center gap-2 border-0 border-r border-solid border-outer-space-700 bg-transparent pl-3 pr-2.5 text-left text-sm leading-none text-white transition-colors hover:bg-outer-space-800 data-[state=open]:bg-outer-space-800',
    stacked:
        'flex h-[38px] cursor-pointer items-center gap-1 overflow-hidden rounded-md border border-solid border-outer-space-700 bg-transparent px-2 text-left leading-none transition-colors hover:border-outer-space-600 data-[state=open]:border-outer-space-500',
    // The one shape that takes the search field's fill rather than standing bare on the bar: it sits
    // right beside that field, and the two should read as one pair of controls.
    // `px-1.5` below sm, `px-2` from there: on a phone the two pixels a side are worth more inside the
    // control — they are what lets the word CONNECTED sit on its line instead of being clipped — and at
    // any wider size there is no shortage to spend them on.
    'stacked-lead':
        'flex h-[38px] cursor-pointer items-center gap-1 overflow-hidden rounded-md border border-solid border-outer-space-700 bg-heavy-metal-800 px-1.5 text-left leading-none transition-colors hover:border-outer-space-600 data-[state=open]:border-outer-space-500 sm:px-2',
    'suffix-stacked':
        'flex h-full cursor-pointer items-center gap-1 overflow-hidden border-0 border-l border-solid border-outer-space-700 bg-transparent pl-2.5 pr-2 text-left leading-none transition-colors hover:bg-outer-space-800 data-[state=open]:bg-outer-space-800',
    text: 'flex h-[38px] cursor-pointer items-center gap-2 border-0 bg-transparent px-2 text-left text-sm leading-none text-white transition-colors hover:text-heavy-metal-100',
};

export interface ClusterDropdownProps {
    /** Which edge of the trigger the popover hangs from — `end` for a right-hand control, `start` near the brand. */
    align?: 'end' | 'start';
    /** Which switcher the popover holds. Defaults to the menu every variant before v3.4 opens. */
    body?: ClusterDropdownBodyKind;
    className?: string;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    shape: ClusterDropdownShape;
}

export function ClusterDropdown({
    align = 'end',
    body = 'menu',
    className,
    onOpenChange,
    open,
    shape,
}: ClusterDropdownProps) {
    const { status, name, cluster, endpoint } = useCluster();
    // Read for one reason: it says `cluster=custom` a render before the selection does, which is what
    // keeps the chip from claiming a provenance it does not have yet.
    const searchParams = useSearchParams();
    const setShowPanel = useSetAtom(clusterModalOpenAtom);

    const label = endpoint ? endpointName(endpoint) : name;
    const { colour, label: statusLabel } = STATUS_STYLE[status];
    // Whether the data is coming from a cluster the app ships with or from an endpoint someone supplied.
    // An endpoint is present exactly on the Custom cluster, so its presence *is* the answer, and the
    // component never has to name `Cluster.Custom` or ask the two questions separately.
    //
    // Stated on every state rather than only on the custom one. Colour is spent on the connection here —
    // the shipping button turns amber for a custom endpoint, this one cannot — so the provenance has to
    // be in words, and a word that appears only sometimes is one a reader has to know to look for.
    const known = endpoint === undefined;
    const rpc = known ? RPC_STYLE.known : RPC_STYLE.unknown;
    const description = `${rpc.label} · ${statusLabel}`;

    // The body's saved-endpoint list can open the panel; nothing in these variants should leave a
    // slide-over on screen behind the popover, so the panel is forced shut while a dropdown is mounted.
    useEffect(() => setShowPanel(false), [setShowPanel]);

    // Both shapes that put the status into words rather than into the dot's hue alone.
    const isStacked = shape === 'stacked' || shape === 'suffix-stacked';
    const isLead = shape === 'stacked-lead';

    /**
     * v3.5 reads the two facts differently, and only on its own trigger (`ClusterCustomLastBody` is the
     * menu that goes with it):
     *
     * - A healthy connection is stated in the menu's grey rather than in the brand green. Colour is spent
     *   on what wants a reader to stop — connecting, and failed — and a permanently green chip on a page
     *   that is working spends it on the ordinary case.
     * - Provenance is three-way, not two: the stamp for an endpoint the app knows, the struck-through stamp
     *   for a remote one nobody has vouched for, and nothing at all for a validator on this machine —
     *   there is no third party in that connection to vouch or fail to vouch for it.
     *
     *   `undefined` is a fourth answer, and the one that ends the green flash: the cluster settles a
     *   render or two before its endpoint does, so on the way to a custom endpoint the chip passed
     *   through "no endpoint yet", which reads as the shipping case and painted the green stamp for a
     *   frame. The query string knows better than the selection does — it already says `cluster=custom`
     *   — so while it does and the endpoint is missing, the chip says nothing rather than guessing.
     */
    const asV35 = body === 'custom-last';
    /**
     * On the Custom cluster the endpoint arrives a render *after* the cluster does, and for that one frame
     * `endpoint` is undefined — which reads as "no custom endpoint at all", i.e. `known`, and painted a
     * green stamp and a green word on the chip for a fraction of a second before the real answer landed.
     * A fact nobody can read at that speed is not worth stating: until the endpoint is in hand there is
     * nothing to say about its provenance, so the mark is simply absent.
     */
    const headedForCustom = cluster === Cluster.Custom || searchParams?.get('cluster') === clusterSlug(Cluster.Custom);
    const provenance = headedForCustom && endpoint === undefined ? undefined : endpointProvenance(endpoint?.href);
    const showLead = asV35 ? provenance === 'known' || provenance === 'unknown' : true;
    const leadKind = asV35 ? (provenance === 'known' ? 'known' : 'unknown') : known ? 'known' : 'unknown';
    const LeadGlyph = ICON_SETS[useAtomValue(iconSetAtom)].provenance[leadKind];
    // `outer-space-300`, the grey this menu's captions are set in, spelled as the palette writes it.
    const CONNECTED_GREY = 'oklch(70.297% 0.0218 185.24)';
    /**
     * The endpoint's name in the stamp's own colour, and white where there is no stamp. The mark is 11px
     * at the head of a 134px chip — the smallest thing on the bar — while the name is what anyone
     * actually reads; saying the same fact in the name's colour puts it where the eye already is. A local
     * validator carries no stamp and so no tint: there is nothing being claimed about it.
     */
    const labelColour = !asV35 || !showLead ? undefined : RPC_STYLE[leadKind].colour;
    const factsColour = asV35 && status === ClusterStatus.Connected ? CONNECTED_GREY : undefined;

    // Only for the focus rule: a keyboard focus lights it, and so does the panel being up.
    const [focused, setFocused] = React.useState(false);

    const chevron = (
        <ChevronDown
            size={14}
            aria-hidden
            className="shrink-0 text-neutral-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
    );

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={`Cluster: ${label}. ${rpc.label} RPC endpoint. ${statusLabel}. Change cluster`}
                    title={`${label} · ${description}`}
                    // The search field's focus rule, on the shape that stands beside that field.
                    style={isLead ? focusRuleStyle(focused || Boolean(open)) : undefined}
                    onFocus={event => setFocused(isKeyboardFocus(event.currentTarget))}
                    onBlur={() => setFocused(false)}
                    className={cn('group min-w-0', TRIGGER_CLASSES[shape], isLead && FOCUS_RULE_CLASSES, className)}
                >
                    {isLead ? (
                        <>
                            <span className="flex min-w-0 flex-1 flex-col items-stretch justify-center gap-0.5">
                                {/* The provenance leads the name: it qualifies what the name refers to, and
                                    reading it after the fact is reading it too late. */}
                                <span className="flex min-w-0 items-center gap-0.5 text-sm leading-[14px] text-white">
                                    {/* 12px, the size the menu below draws it at, so the chip and the list
                                        show one mark rather than two of different sizes.

                                        No vertical nudge: it had a pixel down while the sign was smaller,
                                        and the sign has since grown — with the extra height taken off its
                                        top, that pixel became a slump against a 14px line. */}
                                    {showLead && (
                                        <span
                                            className="flex shrink-0 items-center"
                                            style={{
                                                color: asV35 ? RPC_STYLE[leadKind].colour : rpc.colour,
                                            }}
                                        >
                                            <LeadGlyph size={12} />
                                        </span>
                                    )}
                                    <span
                                        className="min-w-0 truncate"
                                        style={labelColour ? { color: labelColour } : undefined}
                                    >
                                        {label}
                                    </span>
                                </span>
                                {/* Caps, like every other status line in the bar; the phrasing is what
                                    differs here, not the setting. */}
                                <span className="flex min-w-0 items-center gap-1 text-[10px] uppercase leading-[12px] tracking-[0.08em]">
                                    <ClusterFacts
                                        colour={factsColour}
                                        glyphClass={asV35 ? 'hidden' : undefined}
                                        size={11}
                                        status={status}
                                        titleCase
                                    />
                                </span>
                            </span>
                            {chevron}
                        </>
                    ) : isStacked ? (
                        <>
                            {/* The two lines are a column of their own and the chevron is its sibling, so
                                the chevron sits against the middle of the pair rather than riding the name
                                it happens to share a line with. `items-stretch` inside: on the cross axis
                                `flex-start` would size each line to its own content, leaving `min-w-0` and
                                `truncate` nothing to bite on and the label running out through the border. */}
                            <span className="flex min-w-0 flex-1 flex-col items-stretch justify-center gap-0">
                                <span className="truncate text-sm leading-[16px] text-white">{label}</span>
                                {/* Provenance first: it is the fact that changes what the numbers on the
                                    page mean, and on a narrow chip it is the half that must not be the one
                                    to go. Each mark takes the colour of the words it stands beside, so the
                                    two facts stay two facts — and below sm the marks are all there is, the
                                    words being more than a chip that narrow can hold. */}
                                <span className="flex min-w-0 items-center gap-1 text-[9px] font-medium uppercase tracking-[0.12em]">
                                    <ClusterProvenance known={known} labelClass="hidden sm:inline" size={10} />
                                    <span aria-hidden className="hidden shrink-0 text-neutral-600 sm:inline">
                                        ·
                                    </span>
                                    <ClusterFacts labelClass="hidden sm:inline" size={10} status={status} />
                                </span>
                            </span>
                            {chevron}
                        </>
                    ) : (
                        <>
                            <span
                                aria-hidden
                                className={cn('shrink-0 rounded-full', shape === 'compact' ? 'h-2 w-2' : 'h-1.5 w-1.5')}
                                style={{ backgroundColor: colour, boxShadow: `0 0 0 3px ${colour}26` }}
                            />
                            <span className="min-w-0 flex-1 truncate">{label}</span>
                            {chevron}
                        </>
                    )}
                </button>
            </PopoverTrigger>

            {/* 360: a menu's width rather than the slide-over panel's, but wide enough for the widest
                thing a row has to say — "unknown · not connected" beside a group heading, which at 320
                had to wrap. Capped to the viewport less the gutters on phones. Height is the content's —
                no cap, no inner scroll (see v3 for why). */}
            <PopoverContent
                align={align}
                sideOffset={4}
                collisionPadding={16}
                className="w-[360px] max-w-[calc(100vw-2rem)] p-1.5 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.9)]"
            >
                {body === 'field-first' ? (
                    <ClusterFieldFirstBody />
                ) : body === 'custom-last' ? (
                    // Only the controlled case can be shut from inside, and every bar that opens this
                    // menu drives it (one thing open at a time), so there is no uncontrolled case to
                    // cover here.
                    <ClusterCustomLastBody onDismiss={() => onOpenChange?.(false)} />
                ) : (
                    <ClusterDropdownBody />
                )}
            </PopoverContent>
        </Popover>
    );
}
