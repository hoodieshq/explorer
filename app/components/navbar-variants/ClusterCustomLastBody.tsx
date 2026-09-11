'use client';

import { cn } from '@components/shared/utils';
import { DEFAULT_RPC_ENDPOINT, useCluster } from '@entities/cluster';
import {
    type SavedCluster,
    useClusterHref,
    useCustomUrlDraft,
    useSavedClusters,
} from '@features/cluster-switcher/client';
import { Cluster, clusterName, CLUSTERS, clusterSlug } from '@utils/cluster';
import Link from 'next/link';
import { useRef, useState } from 'react';

import {
    ACTIVE_ROW_CLASSES,
    CAPTION_CLASSES,
    FIELD_PLATE_CLASSES,
    FIELD_QUIET_FOCUS_CLASSES,
    INACTIVE_ROW_CLASSES,
    ROW_CLASSES,
} from './cluster-row-classes';
import { DeveloperRow } from './ClusterDropdownBody';
import { KnownMark } from './known-mark';
import { SavedEndpointRow } from './SavedEndpointRow';
import { EndpointFieldWithSave } from './SaveEndpointFlow';

/**
 * Variant 3.5's menu — the same parts as v3.4 in a different order, which is the whole experiment:
 *
 * - **Your own endpoints come second, right under the shipping clusters.** They are the ones a returning
 *   reader is most likely to be reaching for, and in v3.4 they sat below a field they were not going to
 *   type into.
 * - **Custom is last, and it is a heading rather than a row.** Typing a new address is the rarest of the
 *   three actions here and the only one that needs a control, so it sits at the foot of the menu as a
 *   section of its own: the caption, and the field under it. Nothing has to be clicked to reach the field,
 *   and nothing changes shape as the menu is used. The plate around the field is a row's own box, so the
 *   outline that says "this is the one in use" is the same mark the rows carry. v3.4 is the other reading
 *   — a row that owns the field inside its own plate.
 * - **The connection is not stated in here.** As in v3.4: it lives on the control that opens the menu,
 *   which is on screen the whole time; inside, it was the same fact in a second place.
 *
 * `onDismiss` shuts the menu, and only the things that *are* a choice call it: a cluster row, a
 * saved endpoint, and Go in the field. On a phone the popover stands over the page it has just changed, so
 * a value applied behind it reads as nothing having happened. Everything else here — typing, the save,
 * the row's edit and delete — is work inside the menu and leaves it open.
 *
 * Everything underneath is the feature's own and shared with the other bodies: `useCustomUrlDraft`,
 * `SavedEndpointRow` (edit, delete, and the rules about what a delete leaves behind), and
 * `EndpointFieldWithSave`.
 */
export function ClusterCustomLastBody({ onDismiss }: { onDismiss?: () => void }) {
    const { cluster, endpoint } = useCluster();
    const { removeSavedCluster, restoreSavedCluster, savedClusters } = useSavedClusters();
    const buildHref = useClusterHref();
    const draft = useCustomUrlDraft();
    /**
     * The one entry open for editing, and whether it was opened by a save (in which case dismissing it
     * hands the field back its outline and its cursor) or by the reader's own pencil.
     *
     * One at a time, and held here rather than in each row: opening a second entry closes the first,
     * discarding whatever was half-typed in it. Two open forms in a menu this size have no answer to
     * "which of these am I changing?", and the one you were not looking at is the one that would have
     * been saved by mistake.
     */
    const [editing, setEditing] = useState<{ fromSave: boolean; url: string } | undefined>(undefined);
    /** The one row whose actions are unfolded (touch). One at a time, for the reason the row's prop gives. */
    const [actionsUrl, setActionsUrl] = useState<string | undefined>(undefined);
    /**
     * The last endpoint removed, and where it stood, offered back for as long as this menu is open. A
     * delete is one click and the list is the only record of an address anyone typed — there is nowhere
     * else to look it up — so the seconds before the menu closes are worth being able to take it back in.
     * Closing the popover unmounts this body, which is the offer expiring: after that the deletion is
     * simply done.
     */
    const [removed, setRemoved] = useState<({ at: number } & SavedCluster) | undefined>(undefined);
    /** So the cursor can be put back in the field if the naming it opened is dismissed. */
    const fieldRef = useRef<HTMLInputElement>(null);
    /**
     * The caret is placed at the end of the text once, on the first reach into the field, and never again.
     * A click lands the caret where the finger pointed, which in the middle of a URL is rarely where the
     * reader meant to be — but *moving* it on every focus would fight them the moment they come back to
     * fix a character mid-address. The first touch is a starting position; after that the field is
     * theirs.
     */
    const caretPlaced = useRef(false);

    /**
     * The endpoint the app falls back to when Custom is chosen with nothing in the query — a validator on
     * the reader's own machine. It stands at the head of the list as a fixture: pickable like any other
     * row, and neither editable nor deletable, because it is not in storage. There is nothing an edit
     * could land on and nothing a delete could remove; both would simply undo themselves on the next
     * render.
     *
     * Dropped when the reader has saved that URL themselves — their entry is the same endpoint under a
     * name they chose, and two rows for one address is one row too many.
     */
    const pinned: SavedCluster = { name: 'Default', url: DEFAULT_RPC_ENDPOINT.href };
    const showPinned = !savedClusters.some(saved => saved.url === pinned.url);
    const kept = showPinned ? [pinned, ...savedClusters] : savedClusters;
    /**
     * What the list shows: the kept entries, and — while an undo is on offer — the removed one back in the
     * place it held, struck through. It stands where the reader was looking rather than as a notice at the
     * foot of the menu; the list also stops shifting under the finger that just deleted something, which
     * is what made the wrong row easy to hit next.
     */
    // `removed.at` is its index in *storage*; the shown list may carry the pinned default ahead of those,
    // so the tombstone is placed past it or it comes back above a row it never stood above.
    const removedAt = removed === undefined ? 0 : removed.at + (showPinned ? 1 : 0);
    const listed = removed ? [...kept.slice(0, removedAt), removed, ...kept.slice(removedAt)] : kept;

    const onCustom = cluster === Cluster.Custom;
    /**
     * Whether the field is the thing marked as in use. Being on the Custom cluster is not enough on its
     * own: a saved endpoint is a custom one too, so on opening the menu the useful answer is "you are on
     * *this* endpoint, the one with a name" — the saved row takes the outline and the field stays plain.
     *
     * A reader who reaches into the field or types in it has just said they mean the field: from then on
     * the outline is the field's, even when that URL is also in the list. `customChosen` is that latch,
     * and it is state of this menu rather than of the app — closing the popover unmounts this body, so the
     * next open starts from the saved row again.
     *
     * The latch stands on its own, *outside* the "are we on a custom endpoint" test. Putting the cursor in
     * the field is the reader selecting it, and it is selected from that moment — not half a second later
     * when the typing pause commits and the cluster finally becomes Custom. Gated on the cluster, the
     * outline vanished under the cursor the moment it arrived from a shipping cluster, which is the one
     * time a reader is looking straight at it.
     */
    const savedIsLive = onCustom && listed.some(saved => saved.url === endpoint?.href);
    const [customChosen, setCustomChosen] = useState(false);
    const customIsLive = customChosen || (onCustom && !savedIsLive);

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
            {/* Both headings carry the search panel's group spacing (`SearchGroupHeading`): twice the
                air above as below, because a heading belongs to what follows it. The first one needs less
                above it — there is the popover's own padding and nothing to be separated from. */}
            <div className={cn(CAPTION_CLASSES, 'px-3 pb-2 pt-2')}>Cluster</div>

            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {CLUSTERS.filter(net => net !== Cluster.Custom).map(net => (
                    <li key={clusterSlug(net)}>
                        {/* Choosing a cluster is the whole errand, so the menu shuts behind it. */}
                        <Link
                            href={buildHref({ cluster: net })}
                            onClick={() => onDismiss?.()}
                            aria-current={net === cluster ? 'true' : undefined}
                            className={cn(ROW_CLASSES, net === cluster ? ACTIVE_ROW_CLASSES : INACTIVE_ROW_CLASSES)}
                        >
                            {/* Following the name, as the endpoints below do it: every cluster up here is
                                one the app ships with, so each carries the mark, beside the name it
                                belongs to. */}
                            <span className="flex items-center gap-1.5">
                                {clusterName(net)}
                                <KnownMark withLabel={net === cluster} />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            {listed.length > 0 && (
                <>
                    {/* Named, unlike v3.4's, because here the list is not equipment under a field — it is
                        the second group of choices in the menu, and it needs to say whose they are. */}
                    <div className={cn(CAPTION_CLASSES, 'px-3 pb-2 pt-6')}>Your endpoints</div>
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0" data-testid="saved-clusters-section">
                        {listed.map(saved => (
                            <SavedEndpointRow
                                key={saved.url}
                                // The position in *storage*, not in this list: the pinned default sits at
                                // the head of what is shown but is not an entry, so a shown index would
                                // put the restored endpoint one place too far down.
                                onDeleted={entry =>
                                    setRemoved({
                                        ...entry,
                                        at: savedClusters.findIndex(c => c.url === entry.url),
                                    })
                                }
                                // By URL, not by identity: the app's own address is never an entry to
                                // edit or delete, however it came to be in the list.
                                actionsOpen={actionsUrl === saved.url}
                                onActionsToggle={() =>
                                    setActionsUrl(open => (open === saved.url ? undefined : saved.url))
                                }
                                locked={saved.url === pinned.url}
                                removed={saved === removed}
                                onRestore={() => {
                                    if (removed) restoreSavedCluster(removed);
                                    setRemoved(undefined);
                                    // The row comes back as a row, so its actions come back folded: the
                                    // button that was open belonged to the entry being deleted.
                                    setActionsUrl(undefined);
                                }}
                                markUnknown
                                markVetted
                                saved={saved}
                                savedClusters={savedClusters}
                                cluster={cluster}
                                activeUrl={endpoint?.href}
                                editing={editing?.url === saved.url}
                                onEditOpen={() => setEditing({ fromSave: false, url: saved.url })}
                                // Dismissed rather than committed, and opened by a save: cancelling the
                                // form the save opened cancels the save. The two are one act — a click on
                                // the bookmark and the name it asks for — so leaving it by Cancel has to
                                // put the address back where it was, unkept, rather than leave a nameless
                                // entry behind and a filled bookmark saying the opposite. The field then
                                // takes back the outline and the cursor it had when it saved.
                                onEditClose={cancelled => {
                                    if (cancelled && editing?.fromSave) {
                                        removeSavedCluster(editing.url);
                                        setCustomChosen(true);
                                        fieldRef.current?.focus();
                                    }
                                    setEditing(undefined);
                                    // The row comes back as a row, so it comes back folded: the actions
                                    // were open because the reader was on their way into this form, and
                                    // leaving it is the end of that errand.
                                    setActionsUrl(undefined);
                                }}
                                // Picking one loads it into the field, as in v3.4 — and folds the field
                                // away, since a choice made in the list is not a request to type.
                                // Picking one is a choice, so it applies the endpoint and shuts the menu.
                                onPick={url => {
                                    setCustomChosen(false);
                                    draft.select(url);
                                    onDismiss?.();
                                }}
                                active={!customIsLive && endpoint?.href === saved.url}
                                activeFacts={undefined}
                            />
                        ))}
                    </ul>
                </>
            )}

            {/* Last, and a *heading* rather than a row: an endpoint of your own is a section of this menu
                — a caption and the control that belongs to it — not a fifth thing to click. What says the
                field is the endpoint in use is the outline on the field itself, which is where the
                endpoint is; it is the rows' own outline, so "chosen" looks the same wherever it lands.

                The search panel's group spacing (`SearchGroupHeading`): twice the air above as below,
                because a heading belongs to what follows it. */}
            <div className={cn(CAPTION_CLASSES, 'px-3 pb-2 pt-6')}>Custom RPC URL</div>

            {/* The plate is a row's box with the field inside it, so "chosen" is drawn in the menu's own
                language on the menu's own element — and the field stays the design system's field. */}
            <div
                className={cn(FIELD_PLATE_CLASSES, customIsLive ? ACTIVE_ROW_CLASSES : INACTIVE_ROW_CLASSES)}
                data-testid="custom-field-plate"
            >
                <EndpointFieldWithSave
                    draft={fieldDraft}
                    fieldClassName={FIELD_QUIET_FOCUS_CLASSES}
                    fieldRef={fieldRef}
                    // Go is the same errand as picking a row — an endpoint has been chosen — so it ends
                    // the same way: the address applies and the menu gets out of the way.
                    onGo={() => onDismiss?.()}
                    // Reaching into an empty field starts it at the address of a validator on this
                    // machine — the commonest thing anyone types here, and the one nobody enjoys typing.
                    // Only when empty: a field that already holds an endpoint is holding it on purpose.
                    onFocus={() => {
                        setCustomChosen(true);
                        if (draft.value.trim() === '') fieldDraft.onChange(pinned.url);
                        if (caretPlaced.current) return;
                        caretPlaced.current = true;
                        // After the frame, because the line above may have just handed the field a value
                        // it is not showing yet, and the caret has to land at the end of *that*.
                        requestAnimationFrame(() => {
                            const node = fieldRef.current;
                            node?.setSelectionRange(node.value.length, node.value.length);
                        });
                    }}
                    // Saving hands the endpoint over to the list, and the cursor with it: the row that
                    // just appeared opens its name field, so the field here stops being the chosen thing
                    // and lets go of the outline. The typing that follows is about the name, not the
                    // address.
                    onSaved={url => {
                        setCustomChosen(false);
                        setEditing({ fromSave: true, url });
                    }}
                    // `listed`, not `savedClusters`: the pinned default is in the list as far as the
                    // reader is concerned, so the field must not offer to save it a second time. It reads
                    // "Saved" on that address, like any other endpoint already kept.
                    savedClusters={listed}
                />
            </div>

            <div className="-mx-1.5 my-2 h-px bg-outer-space-800" role="presentation" />
            <DeveloperRow />
        </div>
    );
}
