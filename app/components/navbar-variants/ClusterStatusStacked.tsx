'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import { clusterModalOpenAtom, useCluster } from '@entities/cluster';
import { ClusterSwitcherBody } from '@features/cluster-switcher';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { ChevronDown } from 'react-feather';

import { ClusterFacts, ClusterProvenance, endpointName, RPC_STYLE, STATUS_STYLE } from './ClusterDropdownBody';

/**
 * The cluster control for variant 3: the network name with a chevron on one line, the connection status
 * spelled out under it, and the switcher opening in place under the control instead of as the slide-over
 * panel v1 and v2 use. Local to this variant — the shipping `ClusterStatusButton` is what those render,
 * and a design variant has no business changing it.
 *
 * The popover holds `ClusterSwitcherBody`, the panel's own controls, rather than a reimplementation: the
 * custom-endpoint field carries URL parsing, the whitelist check and the consent handshake, so a second
 * copy is how the two surfaces would quietly disagree.
 *
 * A `Popover`, not a `DropdownMenu`. The content is a form — a URL field, saved endpoints, developer
 * toggles — and menu semantics would announce it as a list of commands and fight the inputs for focus.
 *
 * Colour is reserved for the status line. In the shipping button the status colour floods the whole
 * button, so the network name is read against a green/magenta/violet field and the status has to be
 * inferred from it; here the frame is a plain outline and only the status carries a hue.
 */

export function ClusterStatusStacked() {
    const { status, name, endpoint } = useCluster();
    const setShowPanel = useSetAtom(clusterModalOpenAtom);

    const label = endpoint ? endpointName(endpoint) : name;
    const { label: statusLabel } = STATUS_STYLE[status];

    // Whether the data comes from a cluster the app ships with or from an endpoint someone supplied, in
    // the same words and the same colours the shared chip uses.
    const known = endpoint === undefined;
    const rpc = known ? RPC_STYLE.known : RPC_STYLE.unknown;

    // The body's saved-endpoint list opens the panel for a rename; nothing in this variant should leave a
    // slide-over on screen behind the popover, so the panel is forced shut while this control is mounted.
    useEffect(() => setShowPanel(false), [setShowPanel]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={`Cluster: ${label}. ${rpc.label} RPC endpoint. ${statusLabel}. Change cluster`}
                    // Outlined so it reads as a button, but unfilled: no background, so the status line is
                    // still the only colour. Held to the 38px the search field and the burger use.
                    //
                    // Fixed width, not content width: the label swings from `Mainnet Beta` (130px) to a
                    // custom endpoint's host, and a control that resizes on a cluster switch drags the whole
                    // right-hand group with it.
                    //
                    // Three numbers, a quarter narrower than the widths the bar's arithmetic allows. Those
                    // ceilings still matter as the upper bound: below `sm` the row is logo + this + burger,
                    // and `flex-wrap` breaks the line from base sizes, so the sum has to clear the content
                    // box outright — 289px at 321 and 344px at 376, less the logo's 112 and the group's own
                    // 52 (8px gap + a 44px burger), which caps the control at 125 and 180. Going under a
                    // ceiling is always safe for the layout; the cost is paid in the label, which truncates
                    // sooner at the narrow end.
                    //
                    // Vertical: no gap between the rows and a tighter name leading, so the slack shows up
                    // above and below the pair instead of between them. 14px name + 9px status = 25px of
                    // content in 38px, so `justify-center` splits ~6px onto each edge; `px-2` sits a
                    // couple of pixels wider than that at 8px.
                    //
                    // `items-stretch`, not `items-start`: on the cross axis `flex-start` sizes each row to
                    // its own content, so `min-w-0` and `truncate` had nothing to bite on and the label ran
                    // 27px out through the right-hand border instead of clipping. Stretching pins the rows
                    // to the button's width, which is what makes the ellipsis appear.
                    className="group flex h-[38px] w-[110px] cursor-pointer items-center gap-1 overflow-hidden rounded-md border border-solid border-outer-space-700 bg-transparent px-2 text-left leading-none transition-colors hover:border-outer-space-600 xs:w-[146px] sm:w-[170px]"
                >
                    {/* The two lines are a column of their own and the chevron is its sibling, so the
                        chevron sits against the middle of the pair rather than riding the name it happens
                        to share a line with. `items-stretch` inside: on the cross axis `flex-start` would
                        size each line to its own content, leaving `min-w-0` and `truncate` nothing to bite
                        on and the label running out through the border. */}
                    <span className="flex min-w-0 flex-1 flex-col items-stretch justify-center gap-0">
                        <span className="truncate text-sm leading-[16px] text-white">{label}</span>
                        {/* Provenance first, each mark in the colour of its own words: see the shared chip. */}
                        <span className="flex min-w-0 items-center gap-1 text-[9px] font-medium uppercase tracking-[0.12em]">
                            <ClusterProvenance known={known} labelClass="hidden sm:inline" size={10} />
                            <span aria-hidden className="hidden shrink-0 text-neutral-600 sm:inline">
                                ·
                            </span>
                            <ClusterFacts labelClass="hidden sm:inline" size={10} status={status} />
                        </span>
                    </span>
                    {/* The affordance for "this opens a picker". Radix stamps the open state on the
                        trigger, so the flip is free. */}
                    <ChevronDown
                        size={14}
                        aria-hidden
                        className="shrink-0 text-neutral-400 transition-transform group-data-[state=open]:rotate-180"
                    />
                </button>
            </PopoverTrigger>

            {/* Fixed 350px — the panel's own width, so the pills, the URL field and the saved list get the
                room they were laid out for instead of being sized by whatever the trigger happens to be.
                Height is left to the content: no cap, no inner scroll. The cap that was here computed from
                the viewport, so on a short window it shrank the popover to a strip that was technically
                open and practically unreadable. The cost is the other end — a tall enough content on a
                short enough window now runs past the bottom edge instead of scrolling. */}
            <PopoverContent align="end" className="w-[350px] p-6">
                <ClusterSwitcherBody />
            </PopoverContent>
        </Popover>
    );
}
