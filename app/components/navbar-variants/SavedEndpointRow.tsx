'use client';

import { Button } from '@components/shared/ui/button';
import { IconButton } from '@components/shared/ui/icon-button';
import { Input } from '@components/shared/ui/input';
import { cn } from '@components/shared/utils';
import { approveRpcOriginAtom, parseRpcEndpoint } from '@entities/cluster';
import {
    MAX_CLUSTER_NAME_LENGTH,
    type SavedCluster,
    useClusterHref,
    useSavedClusters,
} from '@features/cluster-switcher/client';
import { Cluster, DEFAULT_CLUSTER } from '@utils/cluster';
import { useSetAtom } from 'jotai';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { Edit2, Trash2 } from 'react-feather';

import {
    ACTIVE_ROW_CLASSES,
    INACTIVE_ROW_CLASSES,
    ROW_HOVER_FROM_GROUP,
    STACKED_ROW_CLASSES,
} from './cluster-row-classes';
import { endpointProvenance } from './endpoint-provenance';
import { KnownMark, UnknownMark } from './known-mark';
import { FIELD_CAPTION_CLASSES } from './SaveEndpointFlow';

/**
 * A kept endpoint: the name it was saved under, its host as fine print, and — while it is the one in use —
 * the connection's own facts. On the right, rename and delete. Either a link to the endpoint or, with
 * `onPick`, the same row as a pick: it puts the endpoint back in the Custom field above.
 *
 * The facts are a line of the row rather than an overlay pinned to its right edge, which is what they were
 * and what broke: at 320px the popover leaves a row about 300px wide, the two facts spelled out run past
 * half of that, and they printed straight over the name and host. Everything in this row is in flow now,
 * so a long name truncates instead of colliding.
 *
 * **An entry may have no name.** Saving is one click and naming is a second thought, so the row is where a
 * name is written — either straight after the save (`naming`, opened by the Save button in the field) or
 * any time later from the pencil. Unnamed, the row is headed by its host, which is the only thing there is
 * to call it; the name, once written, takes that place and the host drops to fine print.
 *
 * Identity is the URL, never the name: names may be blank and may repeat. Deleting and renaming address
 * the entry by `saved.url`.
 *
 * The rest of the rules are the panel's (`SavedClusterList`), not this layout's: selecting is a
 * first-party action, so the origin is approved before the navigation lands — otherwise the reader meets
 * the user's own saved endpoint as an unvetted inbound one and prompts for it. Deleting the entry the page
 * is on leaves an endpoint with no home, so the page falls back to the default cluster unless another
 * entry still holds the same URL.
 */
export function SavedEndpointRow({
    active,
    activeFacts,
    activeUrl,
    cluster,
    editing,
    locked,
    markUnknown,
    markVetted,
    onDeleted,
    onEditClose,
    onEditOpen,
    onPick,
    onRestore,
    removed,
    saved,
    savedClusters,
    subdued,
}: {
    active: boolean;
    /** Absent where the surface states the connection somewhere else — v3.4 puts it under the field. */
    activeFacts?: React.ReactNode;
    /** The endpoint the page is actually on, for deciding what a delete leaves behind. */
    activeUrl: string | undefined;
    cluster: Cluster;
    /**
     * Whether this row is the one being edited. Held by the surface rather than by the row, so that only
     * one entry is open at a time: opening another used to leave the first standing, and a menu with two
     * half-filled forms in it has no answer to "which of these am I changing?".
     */
    editing?: boolean;
    /** Reported after a delete, so a surface can offer to put it back while it is still on screen. */
    onDeleted?: (removed: SavedCluster) => void;
    /**
     * The entry is gone from storage but still on screen, struck through, with the way back. It keeps its
     * own place in the list rather than moving to a notice at the foot: the row is where the reader was
     * looking, and "put that back" is easier to mean about a thing than about a sentence about a thing.
     */
    removed?: boolean;
    /** Puts it back. Only meaningful while `removed`. */
    onRestore?: () => void;
    /** The pencil asks; the surface decides which row is open. */
    onEditOpen?: () => void;
    /**
     * Closed. `cancelled` tells a surface whether to undo what it did when it opened this — v3.5 hands
     * the outline and the cursor back to the field when a naming it opened is dismissed.
     */
    onEditClose?: (cancelled: boolean) => void;
    /**
     * Given, the row puts its endpoint back in the Custom field instead of being a link to it, so the
     * field stays the one place an endpoint is read and edited. Without it the row is an anchor, which is
     * what a list of destinations should be.
     */
    onPick?: (url: string) => void;
    saved: SavedCluster;
    savedClusters: SavedCluster[];
    /**
     * The entry is the app's own, not one the reader saved: it can be chosen, and nothing else. No pencil
     * and no bin, because there is nothing behind them — it is not in storage, so an edit would have
     * nowhere to land and a delete nothing to remove; it would simply reappear on the next render.
     */
    locked?: boolean;
    /**
     * Draws the stamp beside an endpoint the app itself knows — one it ships with, or a host on the
     * deployment's whitelist. Not `localhost`: needing no consent is a fact about reach, and a validator
     * on your own desk is yours rather than vetted.
     */
    markVetted?: boolean;
    /**
     * Draws the struck-through stamp beside a *remote* endpoint nobody has vouched for — the case where
     * the numbers on the page come from a stranger. Local endpoints stay unmarked either way
     * (`endpointProvenance`).
     */
    markUnknown?: boolean;
    /**
     * A step quieter than a cluster row — smaller, greyer, lighter. For the body where this list is
     * equipment for the row above it (v3.4's field) rather than a second set of choices standing beside
     * the clusters: at the clusters' own weight it read as a longer list of equals, and the eye had no
     * way to tell the four things the app ships with from the ones the reader typed.
     */
    subdued?: boolean;
}) {
    const buildHref = useClusterHref();
    const approveOrigin = useSetAtom(approveRpcOriginAtom);
    const { removeSavedCluster, updateSavedCluster } = useSavedClusters();
    const router = useRouter();
    const savedEndpoint = parseRpcEndpoint(saved.url);

    /**
     * A touch browser spends the first tap on a row with hover styles showing that hover, and only the
     * second one reaches `onClick` — so a list of endpoints took two taps to use. The pick runs on the
     * pointer's own events instead, and `pickedByPointer` stops the click that follows the same gesture
     * from running it a second time. A keyboard never presses a pointer, so its click still comes through.
     *
     * On the *release*, not the press, and only if the pointer stayed put: a finger that lands on a row
     * to drag the menu is not choosing it, and picking on `pointerdown` applied the row it touched and
     * shut the menu the instant a scroll began — the list could not be scrolled at all on a phone.
     * `pointercancel` is what the browser sends when it takes the gesture over for a scroll.
     */
    const pickedByPointer = useRef(false);
    const pressedAt = useRef<{ x: number; y: number } | undefined>(undefined);
    /** Farther than this and the gesture was a drag, whatever it started as. */
    const TAP_SLOP = 10;

    const onSelect = () => {
        if (savedEndpoint !== undefined) approveOrigin(savedEndpoint);
    };

    const onDelete = () => {
        const wasActive = cluster === Cluster.Custom && saved.url === activeUrl;
        removeSavedCluster(saved.url);
        onDeleted?.(saved);
        const stillSaved = savedClusters.some(c => c.url !== saved.url && c.url === activeUrl);
        if (wasActive && !stillSaved) router.push(buildHref({ cluster: DEFAULT_CLUSTER, customUrl: '' }));
    };

    if (editing)
        return (
            <li data-testid={`saved-cluster-${saved.url}`}>
                <EditRow
                    saved={saved}
                    onCancel={() => onEditClose?.(true)}
                    onSave={(name, nextUrl) => updateSavedCluster({ name, nextUrl, url: saved.url })}
                    onDone={() => onEditClose?.(false)}
                />
            </li>
        );

    // Unnamed, the host is the heading rather than a second line under an empty one.
    const heading = saved.name || savedEndpoint?.host || saved.url;
    const provenance = endpointProvenance(saved.url);
    const mark =
        markVetted && provenance === 'known' ? (
            <KnownMark />
        ) : markUnknown && provenance === 'unknown' ? (
            <UnknownMark />
        ) : undefined;
    /**
     * Set as a search result is (`SearchResultItem`): the name in white 14px medium, the address under it
     * in monospace 12px grey. The two lists answer the same kind of question — "which of these do you
     * mean?" — and a row that borrowed the menu's uniform grey made the name and the address weigh the
     * same, which is why the name did not stand out. The row's fill and rule still say which one is in
     * use; the type no longer has to.
     */
    const contents = (
        // `leading-tight`, and on the stack rather than per line: neither the name's nor the host's size
        // carries a line height of its own (`text-[13px]`, `text-[11px]`), so both inherited the row's
        // 20px and an 11px address sat a third of a line away from the name it belongs to. A unitless
        // 1.25 computes from each line's own size, so the pair closes up without the two lines colliding.
        // `flex-1`, so the column fills the row: without it the stack hugged its own text, and the mark
        // pinned to the end of the name's line stopped an inch short of where the cluster rows above put
        // theirs — it read as sitting beside the name rather than in a column of marks.
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span
                className={cn(
                    'truncate',
                    subdued ? 'text-[13px] font-normal text-outer-space-200' : 'text-sm font-medium text-white',
                    saved.name === '' && 'font-mono',
                    // Struck through and faded while it is gone: the row states its own condition, so the
                    // control beside it needs no sentence to explain what it would undo.
                    removed && 'line-through opacity-60',
                )}
            >
                {heading}
            </span>
            {savedEndpoint && saved.name !== '' && savedEndpoint.host !== saved.name && (
                <span
                    className={cn(
                        'block truncate font-mono',
                        subdued ? 'text-[11px] text-outer-space-400' : 'text-xs text-outer-space-300',
                    )}
                >
                    {savedEndpoint.host}
                </span>
            )}
            {/* On its own line, wrapping if it must: this is the one row whose contents can be wider than
                the popover. */}
            {active && activeFacts !== undefined && (
                <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1">{activeFacts}</span>
            )}
        </span>
    );

    // Room on the right for the two controls, which sit over the row. The stacked treatment rather than
    // the one-line one: a row can be three lines tall, and its controls belong against the name at the top
    // of it rather than floating against its middle.
    const rowClasses = cn(
        STACKED_ROW_CLASSES,
        // Room for the two controls — kept even on a row that has none, so the provenance marks of every
        // row stand in one column. A locked row would otherwise be wider than its neighbours and its mark
        // would sit alone, out to the right of theirs. Four more where their gap is four wider.
        'pr-14 [@media(hover:none)]:pr-[60px]',
        ROW_HOVER_FROM_GROUP,
        active ? ACTIVE_ROW_CLASSES : INACTIVE_ROW_CLASSES,
    );
    // The whole URL stays in `title`, since provider endpoints carry the key in the path or the query and
    // this menu gets opened during screen shares.
    const title = saved.name === '' ? saved.url : `${saved.name} — ${saved.url}`;

    if (removed)
        return (
            <li className="group/row relative" data-testid={`saved-cluster-${saved.url}`}>
                {/* Not a link and not a button: there is nothing to choose until it is back. */}
                <div className={cn(rowClasses, 'cursor-default')} aria-disabled>
                    {contents}
                </div>
                <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={onRestore}
                        data-testid={`restore-cluster-${saved.url}`}
                    >
                        Restore
                    </Button>
                </span>
            </li>
        );

    return (
        <li className="group/row relative" data-testid={`saved-cluster-${saved.url}`}>
            {onPick ? (
                <button
                    type="button"
                    onPointerDown={event => {
                        pressedAt.current = { x: event.clientX, y: event.clientY };
                    }}
                    onPointerCancel={() => {
                        pressedAt.current = undefined;
                    }}
                    onPointerUp={event => {
                        const from = pressedAt.current;
                        pressedAt.current = undefined;
                        if (from === undefined) return;
                        if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > TAP_SLOP) return;
                        pickedByPointer.current = true;
                        onSelect();
                        onPick(saved.url);
                    }}
                    onClick={() => {
                        if (pickedByPointer.current) {
                            pickedByPointer.current = false;
                            return;
                        }
                        onSelect();
                        onPick(saved.url);
                    }}
                    title={title}
                    aria-current={active ? 'true' : undefined}
                    className={cn(rowClasses, 'text-left')}
                    data-testid={`pick-cluster-${saved.url}`}
                >
                    {contents}
                </button>
            ) : (
                <Link
                    href={buildHref({ cluster: Cluster.Custom, customUrl: saved.url })}
                    onClick={onSelect}
                    title={title}
                    aria-current={active ? 'true' : undefined}
                    className={rowClasses}
                >
                    {contents}
                </Link>
            )}
            {/* The provenance mark stands in the row's top-right corner, the same corner the controls
                use — and gives it up to them on hover, since they are what a hand is reaching for once it
                is over the row. A mark trailing the name instead landed wherever that name happened to
                stop, so two rows' marks never lined up. */}
            {mark !== undefined && (
                <span
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center transition-opacity',
                        // Same corner as the controls, so where those are permanent this steps aside for
                        // good rather than only under a cursor that will never come.
                        '[@media(hover:hover)]:group-hover/row:opacity-0',
                        !locked && '[@media(hover:none)]:opacity-0',
                    )}
                    data-testid={`provenance-mark-${saved.url}`}
                >
                    {mark}
                </span>
            )}
            {locked ? undefined : (
                <>
                    {/* Over the row rather than inside the link, because a button inside an anchor is
                        neither valid nor operable. Shown on hover or keyboard focus, and permanently where
                        there is no hover to reveal them with.

                        Deleting is back beside the pencil rather than inside the form it opens: two clicks
                        to drop an endpoint was a tax on the common case, and the undo — the row stays in
                        place, struck through, with the way back — is a better answer to a misplaced thumb
                        than hiding the control was. */}
                    {/* Four pixels more air between them where there is no pointer: on a touch screen both
                        are permanent and a thumb is a blunt instrument, so the two 28px targets that sit
                        two pixels apart under a mouse get six. */}
                    <span className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-0.5 [@media(hover:none)]:gap-1.5">
                        <RowControl
                            label={saved.name === '' ? `Name ${heading}` : `Rename ${saved.name}`}
                            title={saved.name === '' ? 'Name this endpoint' : 'Rename this endpoint'}
                            onClick={() => onEditOpen?.()}
                            testId={`rename-cluster-${saved.url}`}
                        >
                            <Edit2 size={13} aria-hidden />
                        </RowControl>
                        <RowControl
                            label={`Delete ${heading}`}
                            title="Delete this endpoint"
                            onClick={onDelete}
                            danger
                            testId={`delete-cluster-${saved.url}`}
                        >
                            <Trash2 size={14} aria-hidden />
                        </RowControl>
                    </span>
                </>
            )}
        </li>
    );
}

function RowControl({
    children,
    danger,
    label,
    onClick,
    testId,
    title,
}: {
    children: React.ReactNode;
    danger?: boolean;
    label: string;
    onClick: () => void;
    testId: string;
    title: string;
}) {
    return (
        <IconButton
            variant="ghost"
            aria-label={label}
            title={title}
            onClick={onClick}
            className={cn(
                // Two overrides on top of the variant, both with `!` because `cn` is clsx-only and a
                // plain `text-*` would be settled by Tailwind's emission order: the muted idle colour,
                // and the destructive tint on the bin's hover.
                // Revealed by hover on a pointer device; always there where there is no hover to reveal
                // them with. A phone has no way to ask a row to show its controls, so on touch they are
                // part of the row.
                'pointer-events-auto cursor-pointer !text-neutral-500 opacity-0 transition-[opacity,color]',
                // The hover half is behind `@media (hover: hover)`, so a touch screen's emulated hover
                // cannot claim a tap; the `hover:none` half is what makes them permanent there instead.
                'focus-visible:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:none)]:opacity-100',
                danger ? '[@media(hover:hover)]:hover:!text-[#b45be1]' : '[@media(hover:hover)]:hover:!text-white',
            )}
            data-testid={testId}
            icon={children}
        />
    );
}

/**
 * The row while it is being edited: the same plate the chosen row wears, holding the name and the address.
 *
 * Both, because an entry is a name *and* a URL, and a typo in the second used to mean deleting the entry
 * and saving it again from the field. The name's controls ride inside its field, as the bar's Save does —
 * at this width a row of field-height buttons beside a field left too little of the field to read a name
 * in, and outweighed the thing being asked for.
 *
 * Nothing is required of the name. The tick on an empty name leaves the entry unnamed — the host keeps
 * standing in for it, and the pencil is still there tomorrow. The address is not free: the store refuses
 * one that is not an endpoint, and one another entry already holds, and says which.
 */
function EditRow({
    onCancel,
    onDone,
    onSave,
    saved,
}: {
    onCancel: () => void;
    onDone: () => void;
    onSave: (name: string, url: string) => void;
    saved: SavedCluster;
}) {
    const [name, setName] = useState(saved.name);
    const [url, setUrl] = useState(saved.url);
    const [error, setError] = useState<string | undefined>(undefined);
    const host = parseRpcEndpoint(saved.url)?.host ?? '';

    const commit = () => {
        try {
            onSave(name, url.trim());
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not save this endpoint.');
            return;
        }
        onDone();
    };

    // Enter commits from either field, Escape backs out of both. Escape is stopped here because this
    // popover closes on it, and a key that both left the edit and shut the menu would lose the entry the
    // edit was about.
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commit();
        }
        if (event.key === 'Escape') {
            event.stopPropagation();
            onCancel();
        }
    };

    return (
        <div
            className={cn(
                'flex w-full flex-col gap-1.5 rounded-md border border-solid px-3 pb-3 pt-2 text-sm text-white',
                ACTIVE_ROW_CLASSES,
            )}
            data-testid={`rename-cluster-form-${saved.url}`}
        >
            {/* One caption for both ways in — straight after a save, or from the pencil later. The form
                is the same either way, and it holds both halves of the entry, so it says so. */}
            <span className={FIELD_CAPTION_CLASSES}>Edit endpoint name and address</span>
            {/* Plain field, nothing riding inside it. The pair used to sit in this one, which was right
                while the form *was* this one field; with two of them, controls parked in the first said
                they belonged to the name alone — and they answer for the whole form. */}
            <Input
                type="text"
                variant="dark"
                aria-label={`Name for ${saved.url}`}
                placeholder="Name"
                value={name}
                maxLength={MAX_CLUSTER_NAME_LENGTH}
                onChange={e => setName(e.target.value)}
                onKeyDown={onKeyDown}
                data-testid={`rename-cluster-input-${saved.url}`}
                autoFocus
            />
            {/* The address, editable rather than stated: it is half of what an entry is. Monospace, like
                every other address in this menu. */}
            <Input
                type="url"
                variant="dark"
                className="font-mono text-[11px]"
                aria-label={`Address for ${saved.name || host}`}
                placeholder="Address"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={onKeyDown}
                data-testid={`edit-cluster-url-${saved.url}`}
            />
            {error && (
                <span className="text-xs leading-snug text-[#b45be1]" data-testid={`rename-cluster-error-${saved.url}`}>
                    {error}
                </span>
            )}
            {/* The form's own answer and dismissal, once, under both fields — and in words now that they
                are out of the field: a tick reads as an answer only where it sits inside the thing it
                answers for, and this pair answers for the whole form. Left-aligned with the fields above
                them, and Save first, so the reader's eye lands on the answer rather than on the way out. */}
            {/* The form's own answer and dismissal, in words now that they are out of the field: a tick
                reads as an answer only where it sits inside the thing it answers for, and this pair
                answers for the whole form. Left-aligned with the fields above them, Save first, so the
                eye lands on the answer rather than on the way out. Deleting is not here — it is one of
                the row's own controls, where reaching for it costs one click rather than two. */}
            <span className="flex items-center gap-1.5">
                <Button
                    variant="accent"
                    size="sm"
                    className="cursor-pointer"
                    onClick={commit}
                    title="Save this endpoint"
                    data-testid={`confirm-rename-cluster-${saved.url}`}
                >
                    Save
                </Button>
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={onCancel}>
                    Cancel
                </Button>
            </span>
        </div>
    );
}
