'use client';

import { Button } from '@components/shared/ui/button';
import { IconButton } from '@components/shared/ui/icon-button';
import { cn } from '@components/shared/utils';
import { approveRpcOriginAtom, parseRpcEndpoint } from '@entities/cluster';
import { type SavedCluster, useClusterHref, useSavedClusters } from '@features/cluster-switcher/client';
import { Cluster, DEFAULT_CLUSTER } from '@utils/cluster';
import { useSetAtom } from 'jotai';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { Edit2, MoreHorizontal, Trash2 } from 'react-feather';

import {
    ACTIVE_ROW_CLASSES,
    INACTIVE_ROW_CLASSES,
    MENU_SECONDARY_BUTTON_CLASSES,
    ROW_HOVER_FROM_GROUP,
    STACKED_ROW_CLASSES,
} from './cluster-row-classes';
import { endpointProvenance } from './endpoint-provenance';
import { EndpointForm } from './EndpointForm';
import { STROKE_ON_24 } from './icon-sets';
import { KnownMark, UnknownMark } from './known-mark';

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
 * **An entry may have no name.** Older entries were kept unnamed, and a name may still be cleared, so the
 * row has to stand without one: unnamed, it is headed by its host, which is the only thing there is to
 * call it; the name, once written from the pencil, takes that place and the host drops to fine print. The
 * pencil is the row's only form — a new endpoint is named under the field it was typed into, not here.
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
    actionsOpen,
    editing,
    locked,
    markUnknown,
    markVetted,
    onDeleted,
    onActionsToggle,
    onEditClose,
    onEditOpen,
    onPick,
    onRestore,
    removed,
    undoWindowMs,
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
     * Touch only: whether this row's controls are unfolded from behind its one button.
     *
     * On a pointer device they can hide until the cursor arrives, which is what keeps the list reading as
     * a set of choices. A touch screen has no such moment, so they were simply always there — two live
     * targets on every row, on the side a thumb swipes from. One button unfolds them leftwards instead:
     * delete furthest out, the ordinary action in the middle, and the button itself stays put to fold them
     * back.
     *
     * Held by the surface, like `editing`, so only one row is ever unfolded: a second set opening while
     * the first stood there gave the list two right-hand edges of live buttons, and the reader's own
     * place in it was no longer the row they had touched.
     */
    actionsOpen?: boolean;
    onActionsToggle?: () => void;
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
    /**
     * How long the way back stays open, for the drain drawn along the foot of a `removed` row: a thin bar
     * that empties over exactly this long, so the reader can see the deadline coming rather than have the
     * row vanish under them. Without it the row is struck out and stays that way.
     */
    undoWindowMs?: number;
    /** The pencil asks; the surface decides which row is open. */
    onEditOpen?: () => void;
    /** Closed. `cancelled` says whether by the cross rather than the tick, for a surface that cares. */
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
        // `scroll: false`, as everywhere this menu navigates: the reader is in a popover over the page,
        // and the endpoint changing under it is no reason to throw the page itself back to the top.
        if (wasActive && !stillSaved)
            router.push(buildHref({ cluster: DEFAULT_CLUSTER, customUrl: '' }), { scroll: false });
    };

    if (editing)
        return (
            <li data-testid={`saved-cluster-${saved.url}`}>
                <EndpointForm
                    intent="edit"
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
    // Spelled out on the row in use and nowhere else: one worked example teaches the column, and a word
    // on every line would caption a list whose subject is the names.
    const mark =
        markVetted && provenance === 'known' ? (
            <KnownMark withLabel={active} />
        ) : markUnknown && provenance === 'unknown' ? (
            <UnknownMark withLabel={active} />
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
        // `flex-1`, so the column fills the row rather than hugging its own text.
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
            {/* The mark follows the name, close enough to belong to it. Ahead of it, every name in the
                list started a glyph in from the left; at the row's far end it shared a corner with the
                controls and had to hide the moment a hand came near.

                A local address carries none: there is no third party in that connection to vouch or fail
                to vouch for it, so a mark either way would be a verdict on the reader's own desk. */}
            <span className="flex min-w-0 items-center gap-1.5">
                <span
                    className={cn(
                        'truncate',
                        subdued ? 'text-[13px] font-normal text-outer-space-200' : 'text-sm font-medium text-white',
                        saved.name === '' && 'font-mono',
                        // Struck through and faded while it is gone: the row states its own condition, so
                        // the control beside it needs no sentence to explain what it would undo.
                        removed && 'line-through opacity-60',
                    )}
                >
                    {heading}
                </span>
                {mark !== undefined && (
                    <span className="flex shrink-0 items-center" data-testid={`provenance-mark-${saved.url}`}>
                        {mark}
                    </span>
                )}
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
        // On a pointer device the pair is what has to be cleared; on touch it is one button, or three
        // once they are unfolded.
        'pr-14',
        actionsOpen ? '[@media(hover:none)]:pr-[104px]' : '[@media(hover:none)]:pr-9',
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
                        className={MENU_SECONDARY_BUTTON_CLASSES}
                        onClick={onRestore}
                        data-testid={`restore-cluster-${saved.url}`}
                    >
                        Restore
                    </Button>
                </span>
                {undoWindowMs !== undefined && <UndoDrain durationMs={undoWindowMs} url={saved.url} />}
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
                    // The pick itself puts the page back at the top (`scrollPageToTop`, from the draft);
                    // the router's own scrolling only brings the changed segment into view, which stops
                    // with the bar just off the screen.
                    scroll={false}
                    onClick={onSelect}
                    title={title}
                    aria-current={active ? 'true' : undefined}
                    className={rowClasses}
                >
                    {contents}
                </Link>
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
                        {/* Folded away on touch until the button below asks for them; on a pointer device
                            the cursor is the ask, so this wrapper stays out of the way.

                            Delete first in the source, so it ends up furthest from the corner the thumb
                            arrives at: the pair unfolds leftwards, and the ordinary action is the one that
                            lands under the finger, with the destructive one a deliberate reach past it. */}
                        <span
                            className={cn(
                                'flex items-center gap-0.5 [@media(hover:none)]:gap-1.5',
                                !actionsOpen && '[@media(hover:none)]:hidden',
                            )}
                        >
                            <RowControl
                                label={`Delete ${heading}`}
                                title="Delete this endpoint"
                                onClick={onDelete}
                                danger
                                testId={`delete-cluster-${saved.url}`}
                            >
                                <Trash2 size={14} strokeWidth={STROKE_ON_24} aria-hidden />
                            </RowControl>
                            <RowControl
                                label={saved.name === '' ? `Name ${heading}` : `Rename ${saved.name}`}
                                title={saved.name === '' ? 'Name this endpoint' : 'Rename this endpoint'}
                                onClick={() => onEditOpen?.()}
                                testId={`rename-cluster-${saved.url}`}
                            >
                                <Edit2 size={14} strokeWidth={STROKE_ON_24} aria-hidden />
                            </RowControl>
                        </span>
                        {/* Touch only: the one button that unfolds the pair, and folds it again. It keeps
                            the corner the pair grows out of, so the thing under the thumb never moves. */}
                        <RowControl
                            label={actionsOpen ? `Hide actions for ${heading}` : `Actions for ${heading}`}
                            title={actionsOpen ? 'Hide' : 'Edit or delete'}
                            onClick={() => onActionsToggle?.()}
                            expanded={actionsOpen ?? false}
                            className="[@media(hover:hover)]:hidden"
                            testId={`row-actions-${saved.url}`}
                        >
                            <MoreHorizontal size={14} strokeWidth={STROKE_ON_24} aria-hidden />
                        </RowControl>
                    </span>
                </>
            )}
        </li>
    );
}

function RowControl({
    children,
    className,
    danger,
    expanded,
    label,
    onClick,
    testId,
    title,
}: {
    children: React.ReactNode;
    className?: string;
    danger?: boolean;
    /** Set on the button that folds the others out, so it says which state it is in. */
    expanded?: boolean;
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
                // Three overrides on top of the variant, all with `!` because `cn` is clsx-only and a
                // plain `text-*`/`[&_svg]:size-*` would be settled by Tailwind's emission order rather
                // than by intent: the idle colour, the glyph's size on touch, and the destructive tint on
                // the bin's hover. They are drawn light rather than faint — a control you are meant to
                // use should not have to be hunted for.
                //
                // 14px everywhere, over the 12px an icon button draws: these are the only controls a row
                // has, and at the house stroke weight they read as line work rather than as chrome. Two
                // over the stamp's 12, because these are things to hit and that one is only to read. One
                // size on every device, because a control that changes size with the input device is two
                // controls to learn.
                //
                // Revealed by hover on a pointer device; always there where there is no hover to reveal
                // them with. A phone has no way to ask a row to show its controls, so on touch they are
                // part of the row.
                'pointer-events-auto cursor-pointer !text-neutral-300 opacity-0 transition-[opacity,color] [&_svg]:!size-3.5',
                // The hover half is behind `@media (hover: hover)`, so a touch screen's emulated hover
                // cannot claim a tap; the `hover:none` half is what makes them permanent there instead.
                'focus-visible:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:none)]:opacity-100',
                danger ? '[@media(hover:hover)]:hover:!text-[#b45be1]' : '[@media(hover:hover)]:hover:!text-white',
                className,
            )}
            aria-expanded={expanded}
            data-testid={testId}
            icon={children}
        />
    );
}

/**
 * The time left to take a deletion back, as a hairline along the foot of the row that empties from the
 * right over the whole window. A bar and not a count: the question it answers is "do I still have time?",
 * which a shrinking line says at a glance and a number has to be read. It is driven by one CSS transition
 * started a frame after mount — the bar is painted full first, so the transition has something to run
 * from — rather than by a ticking timer, so nothing re-renders while it drains.
 *
 * Inset to the row's own text edges and set a pixel above its floor, so it reads as part of the struck-out
 * row rather than as a rule between rows.
 */
function UndoDrain({ durationMs, url }: { durationMs: number; url: string }) {
    const [draining, setDraining] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setDraining(true));
        return () => cancelAnimationFrame(frame);
    }, []);
    return (
        <span
            aria-hidden
            className="pointer-events-none absolute bottom-1 left-3 right-3 block h-0.5 overflow-hidden rounded-full bg-outer-space-800"
            data-testid={`undo-drain-${url}`}
        >
            <span
                className="block h-full w-full origin-left bg-outer-space-300"
                style={{
                    transform: draining ? 'scaleX(0)' : 'scaleX(1)',
                    transitionDuration: `${durationMs}ms`,
                    transitionProperty: 'transform',
                    transitionTimingFunction: 'linear',
                }}
            />
        </span>
    );
}
