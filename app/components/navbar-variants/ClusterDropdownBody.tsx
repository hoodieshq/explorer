'use client';

import { Input } from '@components/shared/ui/input';
import { Switch } from '@components/shared/ui/switch';
import { cn } from '@components/shared/utils';
import {
    approveRpcOriginAtom,
    customUrlEnabledAtom,
    parseRpcEndpoint,
    type RpcEndpoint,
    useCluster,
} from '@entities/cluster';
import { CustomUrlConsentDialog, SaveClusterForm } from '@features/cluster-switcher';
import {
    type SavedCluster,
    useClusterHref,
    useCustomUrlDraft,
    useSavedClusters,
} from '@features/cluster-switcher/client';
import { Cluster, clusterName, CLUSTERS, clusterSlug, ClusterStatus, DEFAULT_CLUSTER } from '@utils/cluster';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Trash2 } from 'react-feather';

import { ICON_SETS, iconSetAtom } from './icon-sets';

/**
 * The switcher laid out as a menu, for the navbar dropdown. The slide-over panel's body
 * (`ClusterSwitcherBody`) is a stack of full-width pill buttons with headings between them — right for a
 * 350px panel, heavy for a popover hanging off a 38px control. Here every choice is a *row*: the network
 * rows first, with the connection's own facts on the one you are on; the custom endpoint as a row that unfolds its field when
 * chosen; saved endpoints as rows with their host as fine print; and the developer toggle as one row at
 * the foot. No headings — a caption per group, in the bar's own caption style.
 *
 * Only the layout is new. The URL each row navigates to (`useClusterHref`), the field's debounced commit
 * and consent (`useCustomUrlDraft`), the save flow (`SaveClusterForm`) and the developer-bypass
 * confirmation (`CustomUrlConsentDialog`) are the feature's own, so this surface and the panel cannot
 * disagree about what a click does.
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
    labelClass,
    size,
    status,
    titleCase,
}: {
    /** How a chip drops the word on the narrow rows, where the marks say enough. */
    labelClass?: string;
    size: number;
    status: ClusterStatus;
    /** Spelled out as a sentence would, for a caption that is not set in the small caps the others use. */
    titleCase?: boolean;
}) {
    const { colour, label, title } = STATUS_STYLE[status];
    const Glyph = ICON_SETS[useAtomValue(iconSetAtom)].connection[status];
    return (
        <>
            {/* The colour rides a wrapper rather than the glyph, so every set can draw in `currentColor`
                and none of them has to know what the caption's palette is. */}
            <span className="flex shrink-0 items-center" style={{ color: colour }}>
                <Glyph size={size} />
            </span>
            <span className={cn('truncate', labelClass)} style={{ color: colour }}>
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

// The menu links' own grey, hover white: a row here and a link in the bar are the same kind of thing, and
// two greys a shade apart read as a mistake rather than as a distinction.
const ROW_CLASSES =
    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-solid px-3 py-2 text-sm text-outer-space-300 no-underline transition-colors hover:bg-outer-space-800 hover:text-white';
// The rule is what tells the chosen row from a row merely under the cursor — both carry the same fill, and
// on this ground a fill alone is a faint difference. Every row reserves the border, transparent when it is
// not the chosen one, so nothing shifts by a pixel as the choice moves.
// Translucent white, not a palette step: `outer-space-700` is the next step up and reads as a hard rule,
// while the palette is written in `oklch(...)` strings that Tailwind cannot thin with a `/50`, so the
// modifier silently drops the class and the border falls back to `currentColor`.
const ACTIVE_ROW_CLASSES = 'border-white/10 bg-outer-space-800 text-white';
const INACTIVE_ROW_CLASSES = 'border-transparent';
/** The card tables' column headers, as the transaction page sets them, so the panel's headings read as the
 *  page's do — 12px caps in `outer-space-300`, not the legacy `<table>` head's 10px dashkit type. */
const CAPTION_CLASSES = 'text-xs font-normal uppercase text-outer-space-300';

export function ClusterDropdownBody() {
    const { status, cluster, endpoint } = useCluster();
    const { savedClusters } = useSavedClusters();
    const buildHref = useClusterHref();
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
                <span className={CAPTION_CLASSES}>Network</span>
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
                    active={cluster === Cluster.Custom}
                    savedClusters={savedClusters}
                    activeFacts={activeFacts}
                />
            </ul>

            {savedClusters.length > 0 && (
                <>
                    <div className={cn(CAPTION_CLASSES, 'px-3 pb-2 pt-3.5')}>Saved endpoints</div>
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0" data-testid="saved-clusters-section">
                        {savedClusters.map(saved => (
                            <SavedEndpointRow
                                key={saved.name}
                                saved={saved}
                                savedClusters={savedClusters}
                                active={cluster === Cluster.Custom && endpoint?.href === saved.url}
                                activeFacts={activeFacts}
                            />
                        ))}
                    </ul>
                </>
            )}

            <div className="mx-3 my-2 h-px bg-outer-space-800" role="presentation" />
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
    savedClusters,
    activeFacts,
}: {
    active: boolean;
    savedClusters: SavedCluster[];
    activeFacts: React.ReactNode;
}) {
    const buildHref = useClusterHref();
    const { onChange, value } = useCustomUrlDraft();

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
                <Link href={buildHref({ cluster: Cluster.Custom })} className={cn(ROW_CLASSES, INACTIVE_ROW_CLASSES)}>
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
                    'flex w-full flex-col gap-1.5 rounded-md border border-solid px-3 py-2 text-sm',
                    ACTIVE_ROW_CLASSES,
                )}
            >
                <span>Custom RPC URL</span>
                <span className="flex min-w-0 items-center gap-1">{activeFacts}</span>
                <Input
                    type="url"
                    variant="dark"
                    value={value}
                    aria-label="Custom RPC URL"
                    placeholder="https://"
                    onChange={e => onChange(e.target.value)}
                />
                <SaveClusterForm url={value} savedClusters={savedClusters} />
            </div>
        </li>
    );
}

/**
 * A kept endpoint: name with the host as fine print (the whole URL stays in `title`, since provider
 * endpoints carry the key and this menu gets opened during screen shares), a tick when it is the pick,
 * and a delete control that only shows on hover/focus so the list reads as choices, not as a to-do list.
 *
 * Selecting is a first-party action, so the origin is approved before the navigation lands — otherwise
 * the reader treats the user's own saved endpoint as an unvetted inbound one and prompts. Deleting the
 * entry the page is on leaves an endpoint with no home, so the page falls back to the default cluster
 * unless another entry still names the same URL. Both rules are the panel's (`SavedClusterList`).
 */
function SavedEndpointRow({
    active,
    saved,
    savedClusters,
    activeFacts,
}: {
    active: boolean;
    saved: SavedCluster;
    savedClusters: SavedCluster[];
    activeFacts: React.ReactNode;
}) {
    const { endpoint, cluster } = useCluster();
    const buildHref = useClusterHref();
    const approveOrigin = useSetAtom(approveRpcOriginAtom);
    const { removeSavedCluster } = useSavedClusters();
    const router = useRouter();
    const savedEndpoint = parseRpcEndpoint(saved.url);

    const onSelect = () => {
        if (savedEndpoint !== undefined) approveOrigin(savedEndpoint);
    };
    const onDelete = () => {
        const activeUrl = endpoint?.href;
        const wasActive = cluster === Cluster.Custom && saved.url === activeUrl;
        removeSavedCluster(saved.name);
        const stillSaved = savedClusters.some(c => c.name !== saved.name && c.url === activeUrl);
        if (wasActive && !stillSaved) router.push(buildHref({ cluster: DEFAULT_CLUSTER, customUrl: '' }));
    };

    return (
        <li className="group/row relative" data-testid={`saved-cluster-${saved.name}`}>
            <Link
                href={buildHref({ cluster: Cluster.Custom, customUrl: saved.url })}
                onClick={onSelect}
                title={`${saved.name} — ${saved.url}`}
                aria-current={active ? 'true' : undefined}
                // Room on the right for the tick and the delete control, which sit over the row.
                className={cn(ROW_CLASSES, 'pr-16', active ? ACTIVE_ROW_CLASSES : INACTIVE_ROW_CLASSES)}
            >
                <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate">{saved.name}</span>
                    {savedEndpoint && savedEndpoint.host !== saved.name && (
                        <span className="truncate text-xs text-outer-space-300">{savedEndpoint.host}</span>
                    )}
                </span>
            </Link>
            <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {active && activeFacts}
                <button
                    type="button"
                    aria-label={`Delete ${saved.name}`}
                    onClick={onDelete}
                    className="pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-neutral-500 opacity-0 transition-[opacity,color] hover:text-[#b45be1] focus-visible:opacity-100 group-hover/row:opacity-100"
                >
                    <Trash2 size={14} aria-hidden />
                </button>
            </span>
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
function DeveloperRow() {
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
