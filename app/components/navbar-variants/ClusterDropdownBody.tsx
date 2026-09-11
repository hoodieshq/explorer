'use client';

import { Switch } from '@components/shared/ui/switch';
import { cn } from '@components/shared/utils';
import { customUrlEnabledAtom, type RpcEndpoint, useCluster } from '@entities/cluster';
import { CustomUrlConsentDialog } from '@features/cluster-switcher';
import {
    type CustomUrlDraft,
    type SavedCluster,
    useClusterHref,
    useCustomUrlDraft,
    useSavedClusters,
} from '@features/cluster-switcher/client';
import { Cluster, clusterName, CLUSTERS, clusterSlug, ClusterStatus } from '@utils/cluster';
import { useAtom, useAtomValue } from 'jotai';
import Link from 'next/link';
import React, { useState } from 'react';

import { ACTIVE_ROW_CLASSES, CAPTION_CLASSES, INACTIVE_ROW_CLASSES, ROW_CLASSES } from './cluster-row-classes';
import { ICON_SETS, iconSetAtom } from './icon-sets';
import { saveFlowVariantAtom } from './save-flow-variants';
import { SavedEndpointRow } from './SavedEndpointRow';
import { CustomEndpointFields } from './SaveEndpointFlow';

/**
 * The switcher laid out as a menu, for the navbar dropdown. The slide-over panel's body
 * (`ClusterSwitcherBody`) is a stack of full-width pill buttons with headings between them — right for a
 * 350px panel, heavy for a popover hanging off a 38px control. Here every choice is a *row*: the network
 * rows first, with the connection's own facts on the one you are on; the custom endpoint as a row that unfolds its field when
 * chosen; saved endpoints as rows with their host as fine print; and the developer toggle as one row at
 * the foot. No headings — a caption per group, in the bar's own caption style.
 *
 * Only the layout is new. The URL each row navigates to (`useClusterHref`), the field's debounced commit
 * and consent (`useCustomUrlDraft`), the naming rules the save flow holds a name to (`cluster-name`), the
 * store it writes to and the developer-bypass confirmation (`CustomUrlConsentDialog`) are the feature's
 * own, so this surface and the panel cannot disagree about what a click does. The save flow's *layout* is
 * this surface's, in three variants the review switches between — see `SaveEndpointFlow`.
 *
 * Colour: the status hue appears on those facts and nowhere else. Rows are neutral, and the current one
 * is told by its fill rather than by a coloured border, so a menu of five looks like a
 * menu and not five buttons.
 */

/**
 * Provenance carries its own colour, separate from the connection's: the two are different questions, and
 * a caption in one colour reads as one fact. Amber for an endpoint the app did not ship with, which is the
 * tone the shipping cluster button already turns for exactly that case; the brand green for one it did, so
 * a nominal bar is green throughout and anything else breaks that up.
 */
export const RPC_STYLE = {
    known: { colour: '#1dd79b', label: 'known' },
    unknown: { colour: '#e08214', label: 'unknown' },
};

/** The glyph itself lives in `icon-sets`, which the plate can switch; this is what does not vary. */
export const STATUS_STYLE: Record<ClusterStatus, { colour: string; label: string; title: string }> = {
    [ClusterStatus.Connected]: { colour: '#1dd79b', label: 'connected', title: 'Connected' },
    [ClusterStatus.Connecting]: { colour: '#fa62fc', label: 'connecting', title: 'Connecting' },
    [ClusterStatus.Failure]: { colour: '#b45be1', label: 'not connected', title: 'Not Connected' },
};

/**
 * The connection half of the caption: its mark and its word, both in its colour. `size` differs by
 * surface — the chip's caption is 9px type and the panel's is 10px — so the icon is sized to the text
 * beside it rather than to a constant.
 *
 * The panel keeps its words at every width: it is 320px wide whatever the screen is. A chip passes a
 * `labelClass` that hides them on the narrow rows, where two marks say enough and the words would leave
 * nothing of the network's own name.
 */
/**
 * The provenance half of the caption: its mark and its word, in its colour. Split out for the same reason
 * as the connection half — three surfaces render it, and the glyph now varies with the chosen set.
 */
export function ClusterProvenance({ known, labelClass, size }: { known: boolean; labelClass?: string; size: number }) {
    const { colour, label } = known ? RPC_STYLE.known : RPC_STYLE.unknown;
    const Glyph = ICON_SETS[useAtomValue(iconSetAtom)].provenance[known ? 'known' : 'unknown'];
    return (
        <>
            <span className="flex shrink-0 items-center" style={{ color: colour }}>
                <Glyph size={size} />
            </span>
            <span className={cn('shrink-0', labelClass)} style={{ color: colour }}>
                {label}
            </span>
        </>
    );
}

export function ClusterFacts({
    colour: colourOverride,
    glyphClass,
    labelClass,
    size,
    status,
    titleCase,
}: {
    /**
     * Overrides the status palette. For a surface that spends colour differently — v3.5 states a healthy
     * connection in the menu's own grey, keeping the palette's hues for the two states that are worth
     * interrupting a reader over.
     */
    colour?: string;
    /**
     * How a surface drops the mark and keeps the word — the mirror of `labelClass`. v3.5's chip says the
     * connection in words alone: beside a provenance stamp, a second small glyph made the line a row of
     * badges to decode, and the word is the half a reader can take in at a glance.
     */
    glyphClass?: string;
    /** How a chip drops the word on the narrow rows, where the marks say enough. */
    labelClass?: string;
    size: number;
    status: ClusterStatus;
    /** Spelled out as a sentence would, for a caption that is not set in the small caps the others use. */
    titleCase?: boolean;
}) {
    const { colour: paletteColour, label, title } = STATUS_STYLE[status];
    const colour = colourOverride ?? paletteColour;
    const Glyph = ICON_SETS[useAtomValue(iconSetAtom)].connection[status];
    // Connecting is the one state that moves, and the word is half of what says it: the glyph pulsed
    // while "CONNECTING" sat still beside it, which read as two things rather than one fact in progress.
    //
    // On the word only. The icon sets pulse their own connecting glyph, so a second `animate-pulse` on the
    // span around it multiplied the two — the glyph bottomed out at a quarter opacity while the word sat
    // at a half, and the icon looked twice as faint as the text it belongs to.
    const pulse = status === ClusterStatus.Connecting && 'animate-pulse';
    return (
        <>
            {/* The colour rides a wrapper rather than the glyph, so every set can draw in `currentColor`
                and none of them has to know what the caption's palette is. */}
            <span className={cn('flex shrink-0 items-center', glyphClass)} style={{ color: colour }}>
                <Glyph size={size} />
            </span>
            <span className={cn('truncate', pulse, labelClass)} style={{ color: colour }}>
                {titleCase ? title : label}
            </span>
        </>
    );
}

// Custom endpoints are long and often carry a key, so only scheme + host is shown. A local endpoint is
// shown verbatim, because the port is the only thing separating one validator from another.
export function endpointName(endpoint: RpcEndpoint) {
    // No scheme in the collapsed chip: every endpoint has one, so it separates nothing, and the control is
    // a few characters wide. A local one keeps the rest of its href, port and all, because the port is the
    // only thing telling one validator from another; a remote one is cut to the host, since the path and
    // the query are usually a key and this gets read over a shared screen.
    const shown = endpoint.isLocal ? endpoint.href.slice(endpoint.href.indexOf('//') + 2) : endpoint.host;
    return shown.endsWith('/') ? shown.slice(0, -1) : shown;
}

export function ClusterDropdownBody() {
    const { status, cluster, endpoint } = useCluster();
    const { savedClusters } = useSavedClusters();
    const buildHref = useClusterHref();
    /**
     * The endpoint field's state, held here rather than in the field: under the address-bar flow the
     * bookmark list writes into that same field, and two `useCustomUrlDraft` calls would be two drafts
     * that disagree. Mounted whatever the chosen cluster is, which costs nothing — it holds the resolved
     * endpoint, empty off the Custom cluster, and commits only when one of these controls calls it.
     */
    const draft = useCustomUrlDraft();
    const saveFlow = useAtomValue(saveFlowVariantAtom);
    /**
     * The endpoint the Save button in the field has just kept, if any: its row opens with the name field
     * up, which is where naming happens now. Held here because the two are siblings — the field saves, the
     * row asks — and cleared as soon as that row is done with it.
     */
    /** The one entry open for editing: opening another closes it, so the menu never holds two
     *  half-filled forms with no way to tell which one a save would take. */
    const [editingUrl, setEditingUrl] = useState<string | undefined>(undefined);

    /**
     * Whether the Custom row is unfolded into its plate — the caption, the field and the save offer.
     *
     * Being on the Custom cluster is not enough on its own, because a saved endpoint *is* a custom one:
     * picking one used to unfold the plate over the very list it was picked from, so a choice made in the
     * list was answered by a form opening somewhere else. So the plate is up only when the endpoint in
     * play is not one of the saved ones — a hand-typed URL, where the field is the only thing that can
     * show it — or when the reader asked for it by clicking the Custom row.
     *
     * `customOpen` also latches on the first edit and on a save: without that, typing (or saving) a URL
     * that matches a saved entry would fold the plate away mid-sentence.
     */
    const activeIsSaved = cluster === Cluster.Custom && savedClusters.some(saved => saved.url === endpoint?.href);
    const [customOpen, setCustomOpen] = useState(false);
    const showCustomPlate = cluster === Cluster.Custom && (customOpen || !activeIsSaved);

    // Under the address-bar flow a row puts its endpoint back in the field, which then commits it, so the
    // field stays the one place an endpoint is read. Under the others a row is a link straight to it, as
    // it has been. Either way, picking one is a choice about the list and leaves the plate folded.
    const onPick =
        saveFlow === 'omnibox'
            ? (url: string) => {
                  setCustomOpen(false);
                  draft.select(url);
              }
            : undefined;

    /** The field's own draft, which latches the plate open as soon as it is typed into. */
    const fieldDraft: CustomUrlDraft = {
        onChange: next => {
            setCustomOpen(true);
            draft.onChange(next);
        },
        select: draft.select,
        value: draft.value,
    };
    // The same fact the chip states, in the same words and the same colour: a caption that agreed with the
    // trigger only some of the time would be worse than one that said nothing.
    const known = endpoint === undefined;

    /**
     * What stands at the end of the row in use. Its fill already says which one is selected, so the space
     * goes to the two facts about it rather than to a tick that repeats the fill.
     */
    const activeFacts = (
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em]">
            <ClusterProvenance known={known} size={11} />
            <span aria-hidden className="mx-0.5 shrink-0 text-neutral-600">
                ·
            </span>
            <ClusterFacts size={11} status={status} />
        </span>
    );

    return (
        <div className="flex flex-col">
            {/* Just the heading. The two facts used to sit here, at the top of the panel, where they were
                a statement about "the network" in the abstract; they now stand on the row of the network
                they are about, which is where a reader looks to check them. */}
            {/* Room to breathe on both sides of it: the panel's own 6px plus 8 above and 8 below, which
                at 12px caps is what keeps the heading from sitting on the first row. */}
            <div className="flex items-center px-3 pb-2 pt-2">
                {/* "Cluster", the word the panel has always used ("Choose a Cluster") and the word the
                    trigger says — one thing should not be called two things across two surfaces. */}
                <span className={CAPTION_CLASSES}>Cluster</span>
            </div>

            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {CLUSTERS.filter(net => net !== Cluster.Custom).map(net => {
                    const active = net === cluster;
                    return (
                        <li key={clusterSlug(net)}>
                            <Link
                                href={buildHref({ cluster: net })}
                                aria-current={active ? 'true' : undefined}
                                className={cn(ROW_CLASSES, active ? ACTIVE_ROW_CLASSES : INACTIVE_ROW_CLASSES)}
                            >
                                {clusterName(net)}
                                {active && activeFacts}
                            </Link>
                        </li>
                    );
                })}
                <CustomEndpointRow
                    active={showCustomPlate}
                    draft={fieldDraft}
                    onOpen={() => setCustomOpen(true)}
                    onSaved={url => {
                        setCustomOpen(true);
                        setEditingUrl(url);
                    }}
                    savedClusters={savedClusters}
                    activeFacts={activeFacts}
                />
            </ul>

            {savedClusters.length > 0 && (
                <>
                    {/* The search panel's group heading spacing, to the pixel (`SearchGroupHeading`):
                        twice the air above as below, because the heading belongs to the group under it and
                        the wider gap is what separates it from the group that ended above. */}
                    <div className={cn(CAPTION_CLASSES, 'px-3 pb-2 pt-6')}>Saved endpoints</div>
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0" data-testid="saved-clusters-section">
                        {savedClusters.map(saved => (
                            <SavedEndpointRow
                                // The URL, not the name: a name may be blank and may repeat, so it is no
                                // key — two unnamed entries would collide on it.
                                key={saved.url}
                                saved={saved}
                                savedClusters={savedClusters}
                                cluster={cluster}
                                activeUrl={endpoint?.href}
                                editing={editingUrl === saved.url}
                                onEditOpen={() => setEditingUrl(saved.url)}
                                onEditClose={() => setEditingUrl(undefined)}
                                onPick={onPick}
                                // While the plate is up it is the thing in use, and the row it came from
                                // stands plain: two rows wearing the fill for one endpoint says there are
                                // two of it.
                                active={!showCustomPlate && endpoint?.href === saved.url}
                                activeFacts={activeFacts}
                            />
                        ))}
                    </ul>
                </>
            )}

            {/* Full-bleed: this rule divides the switcher from the setting under it, and a rule that
                stops short of the edges reads as belonging to a row rather than as separating two parts of
                the menu. `-mx-1.5` is the popover's own padding, cancelled. */}
            <div className="-mx-1.5 my-2 h-px bg-outer-space-800" role="presentation" />
            <DeveloperRow />
        </div>
    );
}

/**
 * The Custom entry: a row like the others, which unfolds the endpoint field and the save offer beneath it
 * while it is the pick. Its href carries no endpoint, so re-selecting Custom keeps whatever the query
 * string holds (as the panel's pill does).
 */
function CustomEndpointRow({
    active,
    activeFacts,
    draft,
    onOpen,
    onSaved,
    savedClusters,
}: {
    active: boolean;
    activeFacts: React.ReactNode;
    draft: CustomUrlDraft;
    /** Asked for by the reader: on the Custom cluster already, the href changes nothing, so the click has
     *  to say so itself. */
    onOpen: () => void;
    onSaved: (url: string) => void;
    savedClusters: SavedCluster[];
}) {
    const buildHref = useClusterHref();

    // Chosen, this stops being a row and becomes a plate: the name, its two facts under it, and the
    // address they are about, all on one ground. The address used to sit outside the fill, which made it
    // look like a section that happened to follow rather than the endpoint the row is naming — and the
    // facts had to share the name's line, where there is no room for them beside a URL.
    //
    // A plate and not a link, because it holds a field: an `<input>` inside an anchor is neither valid nor
    // usable. The unselected row stays a link, since then it is only somewhere to go.
    if (!active) {
        return (
            <li>
                <Link
                    href={buildHref({ cluster: Cluster.Custom })}
                    onClick={onOpen}
                    className={cn(ROW_CLASSES, INACTIVE_ROW_CLASSES)}
                >
                    Custom RPC URL
                </Link>
            </li>
        );
    }

    return (
        <li>
            <div
                aria-current="true"
                className={cn(
                    // `pb-3`, not `py-2`: the plate's sides are 12px, and 8px underneath the field left
                    // the box looking as though the last control had been pushed against its floor. The
                    // top stays at 8px, which is what keeps this plate's first line where the row's text
                    // was before it unfolded.
                    'flex w-full flex-col gap-1.5 rounded-md border border-solid px-3 pb-3 pt-2 text-sm font-medium text-white',
                    ACTIVE_ROW_CLASSES,
                )}
            >
                <span>Custom RPC URL</span>
                <span className="flex min-w-0 flex-wrap items-center gap-1">{activeFacts}</span>
                {/* The field and the offer to keep what is in it, laid out by whichever save flow the
                    review has selected. */}
                <CustomEndpointFields draft={draft} onSaved={onSaved} savedClusters={savedClusters} />
            </div>
        </li>
    );
}

/**
 * The developer bypass as one row: label, a one-line hint, the switch. Turning it off needs no
 * confirmation (it only makes the app ask more often); turning it on grants a standing permission for
 * every link the browser opens, so it is confirmed once — the same dialog the panel uses.
 */
// `items-start` on the row below: the label runs to two lines, and the switch belongs against the first
// of them, where the thing it governs is named, rather than floating against the middle of the sentence.
// Two pixels down from there, so it sits on the label's own line rather than on the top of its box — the
// text has leading above it that the switch does not.
export function DeveloperRow() {
    const [enabled, setEnabled] = useAtom(customUrlEnabledAtom);
    const [confirming, setConfirming] = useState(false);

    const onCheckedChange = (next: boolean) => {
        if (!next) {
            setEnabled(false);
            return;
        }
        setConfirming(true);
    };

    return (
        <div className="flex items-start justify-between gap-3 px-3 pb-1.5 pt-1">
            <label htmlFor="nav-cluster-trust-toggle" className="flex min-w-0 cursor-pointer flex-col leading-tight">
                {/* White, like the row it switches: this is the setting's name, the line under it is what
                    the setting does. */}
                <span className="text-sm text-white">Trust any customUrl param</span>
                <span className="mt-1 text-xs text-outer-space-300">
                    Connect without asking. Only for your own endpoints.
                </span>
            </label>
            <Switch
                id="nav-cluster-trust-toggle"
                className="mt-0.5"
                checked={enabled}
                onCheckedChange={onCheckedChange}
            />

            <CustomUrlConsentDialog
                request={confirming ? { kind: 'developer-bypass' } : undefined}
                onConfirm={() => {
                    setEnabled(true);
                    setConfirming(false);
                }}
                onCancel={() => setConfirming(false)}
            />
        </div>
    );
}
