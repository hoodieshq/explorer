'use client';

import { cn } from '@components/shared/utils';
import { useCluster } from '@entities/cluster';
import {
    scrollPageToTop,
    useClusterHref,
    useCustomUrlDraft,
    useSavedClusters,
} from '@features/cluster-switcher/client';
import { Cluster, clusterName, CLUSTERS, clusterSlug } from '@utils/cluster';
import Link from 'next/link';
import { useState } from 'react';

import {
    ACTIVE_ROW_CLASSES,
    CAPTION_CLASSES,
    CUSTOM_PLATE_CLASSES,
    INACTIVE_ROW_CLASSES,
    ROW_CLASSES,
} from './cluster-row-classes';
import { DeveloperRow } from './ClusterDropdownBody';
import { KnownMark } from './known-mark';
import { SavedEndpointRow } from './SavedEndpointRow';
import { EndpointFieldWithSave } from './SaveEndpointFlow';

/**
 * Variant 3.4's menu: the same shipping clusters at the top, then Custom with its field standing open
 * inside it — always, with nothing to unfold — and the endpoints you have kept listed beneath as things to
 * load into that field.
 *
 * What it changes about `ClusterDropdownBody`, and why:
 *
 * - **The Custom row no longer unfolds.** It is still a choice at the foot of the cluster list, and
 *   choosing it is still what puts the app on the endpoint in its field — but the field is always there,
 *   inside the same plate, so the whole switcher is legible at a glance and nothing changes shape as it
 *   is used. v3.5 is the other reading of this: a heading and a field, with no row at all.
 * - **The connection is not stated in here at all.** It is on the control that opens this menu, which is
 *   on screen the whole time and is where a reader already looks to see what they are connected to;
 *   repeating it inside meant the same fact in two places, and it moved as the selection did. What the
 *   menu marks instead is what is true of each *row*: a stamp on the endpoints the app knows.
 * - **A saved endpoint is loaded, not navigated to.** Clicking one fills the field (and commits it, as
 *   typing does), so the field stays the single place an endpoint is read, corrected and saved from. The
 *   list is set a step quieter than the clusters, because it is equipment for the row above it rather
 *   than a second set of choices of equal standing.
 *
 * Everything underneath is the feature's own, shared with the other bodies: `useCustomUrlDraft` (the
 * debounced commit and the consent), `SavedEndpointRow` (naming, renaming, deleting, and the rules about
 * what a delete leaves behind), `EndpointFieldWithSave` (one-click save) and `DeveloperRow`.
 */
export function ClusterFieldFirstBody() {
    const { cluster, endpoint } = useCluster();
    const { savedClusters } = useSavedClusters();
    const buildHref = useClusterHref();
    const draft = useCustomUrlDraft();
    /** The one entry open for editing: opening another closes it, so a menu never holds two half-filled
     *  forms with no way to tell which one a save would take. */
    const [editingUrl, setEditingUrl] = useState<string | undefined>(undefined);
    /** The one row whose actions are unfolded (touch), for the reason the row's own prop gives. */
    const [actionsUrl, setActionsUrl] = useState<string | undefined>(undefined);

    const onCustom = cluster === Cluster.Custom;
    /**
     * Which of the two wears the fill while the app is on a custom endpoint: the Custom plate, or the
     * saved row that holds the same URL. Never both — that said the app was on two things at once.
     *
     * The saved row wins by default, because on opening the menu the useful answer is "you are on *this*
     * endpoint, the one with a name". A reader who reaches into the field or types in it has just said
     * they mean the field, so from then on the outline is the field's, even when its URL is also in the
     * list. `customChosen` is that latch, and it is state of this menu rather than of the app: closing the
     * popover unmounts this body, so the next open starts from the saved row again.
     */
    const savedIsLive = onCustom && savedClusters.some(saved => saved.url === endpoint?.href);
    const [customChosen, setCustomChosen] = useState(false);
    const customIsLive = onCustom && (customChosen || !savedIsLive);

    /** The field's own draft, which latches that choice as soon as it is typed into. */
    const fieldDraft = {
        onChange: (next: string) => {
            setCustomChosen(true);
            draft.onChange(next);
        },
        select: draft.select,
        value: draft.value,
    };

    return (
        <div className="flex flex-col">
            {/* Both headings carry the search panel's group spacing. */}
            <div className={cn(CAPTION_CLASSES, 'px-3 pb-2 pt-2')}>Cluster</div>

            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {CLUSTERS.filter(net => net !== Cluster.Custom).map(net => {
                    const active = net === cluster;
                    return (
                        <li key={clusterSlug(net)}>
                            <Link
                                href={buildHref({ cluster: net })}
                                scroll={false}
                                // The page's data is replaced wholesale, and it is read from the top.
                                onClick={scrollPageToTop}
                                aria-current={active ? 'true' : undefined}
                                className={cn(ROW_CLASSES, active ? ACTIVE_ROW_CLASSES : INACTIVE_ROW_CLASSES)}
                            >
                                {clusterName(net)}
                                {/* Every cluster up here is one the app ships with, so every one of them
                                    carries the mark — and it is the same mark the saved endpoints the app
                                    knows carry below, so the reader learns it once. */}
                                <KnownMark />
                            </Link>
                        </li>
                    );
                })}
                {/* Custom is a choice like the others, so it can be *chosen* — and its field lives inside
                    the same plate, because it is the equipment of that choice rather than a section that
                    happens to follow it. The plate takes the fill and the rule only while Custom is the
                    one in use. */}
                <li className={cn(CUSTOM_PLATE_CLASSES, customIsLive ? ACTIVE_ROW_CLASSES : INACTIVE_ROW_CLASSES)}>
                    <Link
                        href={buildHref({ cluster: Cluster.Custom })}
                        scroll={false}
                        onClick={() => {
                            scrollPageToTop();
                            setCustomChosen(true);
                        }}
                        aria-current={customIsLive ? 'true' : undefined}
                        className="text-sm font-medium text-white no-underline"
                        data-testid="custom-cluster-row"
                    >
                        Custom RPC URL
                    </Link>
                    <EndpointFieldWithSave
                        draft={fieldDraft}
                        onFocus={() => setCustomChosen(true)}
                        onSaved={setEditingUrl}
                        savedClusters={savedClusters}
                    />
                </li>
            </ul>

            {/* No heading of its own: these are the endpoints of the group above — things to load into
                that field — and a second caption in the same caps type as "Cluster" put them on the level
                of the two subjects of the menu, which they are not. The gap does the separating. */}
            {savedClusters.length > 0 && (
                <>
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 pt-1.5" data-testid="saved-clusters-section">
                        {savedClusters.map(saved => (
                            <SavedEndpointRow
                                key={saved.url}
                                actionsOpen={actionsUrl === saved.url}
                                onActionsToggle={() =>
                                    setActionsUrl(open => (open === saved.url ? undefined : saved.url))
                                }
                                markVetted
                                subdued
                                saved={saved}
                                savedClusters={savedClusters}
                                cluster={cluster}
                                activeUrl={endpoint?.href}
                                editing={editingUrl === saved.url}
                                onEditOpen={() => setEditingUrl(saved.url)}
                                onEditClose={() => {
                                    setEditingUrl(undefined);
                                    // Folded again: the actions were open on the way into this form, and
                                    // leaving it ends that errand.
                                    setActionsUrl(undefined);
                                }}
                                // Picking from the list is choosing the list: it hands the fill back to
                                // the row that was picked.
                                onPick={url => {
                                    setCustomChosen(false);
                                    draft.select(url);
                                }}
                                active={!customIsLive && endpoint?.href === saved.url}
                                // The connection is stated at the head of the menu in this body, so no
                                // row carries it; the fill and the rule say which one is loaded.
                                activeFacts={undefined}
                            />
                        ))}
                    </ul>
                </>
            )}

            <div className="-mx-1.5 my-2 h-px bg-outer-space-800" role="presentation" />
            <DeveloperRow />
        </div>
    );
}
