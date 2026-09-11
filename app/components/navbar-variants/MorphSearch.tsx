'use client';

import { cn } from '@components/shared/utils';
import { useHotkeys } from '@mantine/hooks';
import React, { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Search, X } from 'react-feather';

import { AuroraField, type AuroraFieldTuning } from './AuroraField';

/**
 * The search field that is shown outright where there is room and lives in a button where there is not —
 * One component, so the variants that use it differ in *where* the field sits and *what
 * shares its frame*, not in how it moves.
 *
 * One element. From `dockFrom` it is in flow, always open: a framed field growing with the bar (the caller
 * aligns and caps it through `dockClassName`). Below that it is a 38px outlined square at rest — the lens
 * in it — positioned absolutely over its own slot in the bar (the caller keeps a spacer there and hands the
 * slot's insets in as `restClassName`, computed from its own row arithmetic); tapped, its `left` and
 * `right` animate from the slot to the gutters, so the square stretches across the row and, closed,
 * shrinks back into itself. The frame, the radius and the ground are continuous through the motion. The
 * lens turns into a cross in place, since the same button closes what it opened.
 *
 * `prefix` and `suffix` are nodes that share the frame at its left and right ends — v5.1 puts the network
 * selector at the tail — and ride that edge through the motion. The toggle sits between
 * the input and the suffix, so a closed frame reads lens · suffix and an open one input · cross · suffix.
 *
 * The slot's insets come one of two ways. `restClassName` is the caller's arithmetic as classes, for a bar
 * whose slot sits after fixed-width controls only. `slotRef` points at the spacer instead and the insets
 * are measured — needed where text of unknown width (the link row) stands between the slot and an edge —
 * and re-measured on resize. `dockFrom: 'none'` is a field that is never shown outright: the square at
 * every width, the field on demand only. `quiet` drops the square's outline at rest — a glyph with a hover
 * ground, for a bar whose controls are text on a ground; the frame returns with the field.
 *
 * `focusGlow` picks the focus treatment. `ring` is the plain glow around the whole frame the other
 * variants use. `underline` is two things at once: an aurora under the *input alone* (`AuroraField`),
 * brightest where the text begins and falling away towards the tail, and the frame's own rule lighting up
 * in the brand green. The aurora says where the light comes from; the lit rule says which control has the
 * caret, which a band under the text alone leaves ambiguous once the field shares its frame with a
 * network selector. Nothing is drawn outside the rule in either non-ring mode — `halo` leaves that to
 * `AuroraBorder`, and `underline` wants none. Both take the same asymmetric timing — 300ms in, four times
 * that out — so they rise and settle together rather than as two effects that happen to overlap.
 *
 * The field is the shipping `SearchBar` (the bar's `children`), mounted once. Its own frame — the `div`
 * `BaseSearch` anchors its popover to, the only `div` child of cmdk's root — is stripped of rule, ground
 * and shadow from outside, so this box carries the frame instead; its lens is made white to match the
 * controls. Below `dockFrom` the `/` hint is hidden (the cross takes that end) and the input is
 * `display: none` while closed — out of the tab order, and out of the *layout*, so a `prefix` beside it
 * fills the square instead of splitting it with an input nobody can see.
 *
 * Opening focuses the input synchronously, inside the gesture: the render is flushed first, since a
 * `display: none` input cannot take focus, and iOS raises the keyboard only for a focus that happens
 * within the tap. `/` and `⌘K` go the same way; `BaseSearch`'s own handler for those keys does nothing
 * against a hidden input and simply focuses a docked one.
 */

/**
 * `bg-heavy-metal-800`, spelled out: the lit rule has to paint the field's own ground back over its
 * middle — the ring is a background clipped to the border box, and without a layer on top of it the
 * gradient would wash across the whole field.
 */
const GROUND = 'oklch(30.098% 0.01205 160.58)';

export type DockFrom = 'lg' | 'md' | 'none' | 'sm';

/**
 * Per-threshold class sets, spelled out in full: Tailwind finds classes by scanning source, so a
 * `${bp}:` template would produce nothing. `kbd` hides below the threshold; `!pr-1` there brings the
 * input's own right padding in, since the cross sits where the `/` hint would.
 */
// The docked frames carried a `hover:border-outer-space-700`, which is the colour they already have at
// rest — a no-op, except that Tailwind emits `hover` after `focus-within`, so it quietly won over the lit
// rule and the border reverted to grey the moment the pointer crossed a focused field. Dropped.
// Below the dock the toggle lies over the frame's right end rather than beside it, so the search box — and
// with it the results panel, whose width comes from the box it is anchored to, and the glow, which spans
// the box it sits in — is the frame's full width. The padding is what keeps the text and the hotkey hint
// from running under the button.
//
// `BaseSearch`'s own clear button goes with them, and only here: two crosses a few pixels apart are a
// question rather than a control, so below the dock the frame's cross does both jobs — clear, then close.
// Docked, the frame has no cross of its own and the field's own one is the only way to empty it by mouse.
const DOCK: Record<DockFrom, { belowDock: string; frame: string; gone: string; ring: string; shown: string }> = {
    lg: {
        belowDock:
            '[@media(max-width:992px)]:[&_kbd]:hidden [@media(max-width:992px)]:[&_[data-search-frame]]:!pr-[38px] [@media(max-width:992px)]:[&_[data-search-frame]>button]:!hidden',
        frame: 'lg:relative lg:inset-auto lg:h-[38px] lg:min-w-0 lg:flex-1 lg:bg-heavy-metal-800',
        gone: 'lg:hidden',
        ring: 'lg:focus-within:shadow-[0_0_0.4rem_#00d18c]',
        shown: 'lg:block',
    },
    md: {
        belowDock:
            '[@media(max-width:767px)]:[&_kbd]:hidden [@media(max-width:767px)]:[&_[data-search-frame]]:!pr-[38px] [@media(max-width:767px)]:[&_[data-search-frame]>button]:!hidden',
        frame: 'md:relative md:inset-auto md:h-[38px] md:min-w-0 md:flex-1 md:bg-heavy-metal-800',
        gone: 'md:hidden',
        ring: 'md:focus-within:shadow-[0_0_0.4rem_#00d18c]',
        shown: 'md:block',
    },
    none: {
        belowDock: '[&_kbd]:hidden [&_[data-search-frame]]:!pr-[38px] [&_[data-search-frame]>button]:!hidden',
        frame: '',
        gone: '',
        ring: '',
        shown: '',
    },
    sm: {
        belowDock:
            '[@media(max-width:575px)]:[&_kbd]:hidden [@media(max-width:575px)]:[&_[data-search-frame]]:!pr-[38px] [@media(max-width:575px)]:[&_[data-search-frame]>button]:!hidden',
        frame: 'sm:relative sm:inset-auto sm:h-[38px] sm:min-w-0 sm:flex-1 sm:bg-heavy-metal-800',
        gone: 'sm:hidden',
        ring: 'sm:focus-within:shadow-[0_0_0.4rem_#00d18c]',
        shown: 'sm:block',
    },
};

/** Strips `BaseSearch`'s own frame — the box it anchors its popover to — of rule, ground and shadow, and
 *  makes its lens white to match the controls. Important, because `cn` is clsx-only and these have to beat
 *  the frame's own utilities regardless of emission order.
 *
 *  Selected by `data-search-frame` and not by position among cmdk's children: the results panel is a
 *  direct child of that root too, so a bare `>div` reached the panel as well — it wore the field's height,
 *  ground and padding — while `:first-child` reached neither, cmdk's own label being first. */
export const STRIP_SEARCH_FRAME_CLASSES =
    '[&_[data-search-frame]]:!border-0 [&_[data-search-frame]]:!bg-transparent [&_[data-search-frame]]:!shadow-none [&_[data-search-frame]]:focus-within:!shadow-none [&_[data-search-frame]>svg]:!text-white';

/**
 * Lines the results panel up with the frame's rule rather than with the box the panel is anchored to.
 * Radix takes the panel's width and its left edge from that box, and here the box carries no rule of its
 * own — the frame around it does — so the panel came out a pixel inside the field on either side. Two
 * pixels wider and one to the left is the frame's border box exactly.
 */
const ALIGN_SEARCH_PANEL_CLASSES =
    '[&_[data-search-panel]]:!-ml-px [&_[data-search-panel]]:!w-[calc(var(--radix-popover-trigger-width)+2px)]';

/**
 * The aurora under the field, off for now — the graded rule carries the focus on its own and the band was
 * the louder half of the pair. Everything it needs is still here (`AuroraField`, the shader, the per-bar
 * tuning each variant passes): flipping this back to `true` brings it back as it was.
 */
const AURORA_ENABLED = false;

/**
 * Hands the search's own frame the height of the box it sits in, all the way down the chain — the wrapper
 * it is given, `SearchBar`'s own div, cmdk's root, and the frame itself. It asks for a flat 38px, which is
 * two more than a 38px bordered box has inside it: left alone it overhangs, so its lens and its hotkey
 * hint centre a pixel low and its foot is clipped. A percentage height needs every ancestor to have one,
 * which is why this is four selectors rather than one.
 */
const FILL_SEARCH_HEIGHT_CLASSES = '[&>div]:h-full [&_[cmdk-root]]:h-full [&_[data-search-frame]]:!h-full';

export interface MorphSearchProps {
    /** Passed to the aurora under the field, for a bar that wants its light finer or hotter than default. */
    aurora?: AuroraFieldTuning;
    /** The search bar. */
    children: ReactNode;
    /** Docked-state alignment and cap, e.g. `lg:ml-auto lg:max-w-[560px]`. */
    dockClassName?: string;
    /** From which screen the field is simply there. */
    dockFrom: DockFrom;
    /** What the field stands on: its own sunken fill, or nothing, letting the bar through. */
    /** Focus treatment: the ring around the frame, the aurora under the input, or — `halo` — the lit rule
     *  alone, for a bar that draws the aurora *outside* the frame, which this clipped box cannot do. */
    focusGlow?: 'halo' | 'ring' | 'underline';
    /** Handed the frame element, for a glow that has to measure it from outside. */
    frameRef?: RefObject<HTMLDivElement | null>;
    /** Told when the frame gains or loses focus, for the same. */
    onFocusChange?: (focused: boolean) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    /** Shares the frame at its left end; rides the left edge through the motion. */
    prefix?: ReactNode;
    /** No outline at rest: the lens on the bar's ground with a hover ground, the frame only once open. */
    quiet?: boolean;
    /** The rest-state square stands on the field's own fill rather than bare on the bar — for a bar whose
     *  other controls are filled. Only visible below `dockFrom`; docked, the frame is filled anyway. */
    restFilled?: boolean;
    /** Closed-state `left`/`right` per screen below `dockFrom` — the slot the square rests in — as classes.
     *  Extra rest-state styling (say, a borderless look from lg) goes here too. */
    restClassName?: string;
    /** The spacer the square rests over; its insets are measured from it instead of coming as classes. */
    slotRef?: RefObject<HTMLElement | null>;
    /** Shares the frame at its right end, past the toggle; rides the right edge through the motion. */
    suffix?: ReactNode;
}

export function MorphSearch({
    aurora,
    children,
    dockClassName,
    dockFrom,
    focusGlow = 'ring',
    frameRef,
    onFocusChange,
    onOpenChange,
    open,
    prefix,
    quiet,
    restClassName,
    restFilled,
    slotRef,
    suffix,
}: MorphSearchProps) {
    const dock = DOCK[dockFrom];
    const fieldRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const wasOpen = useRef(false);
    const [slotInsets, setSlotInsets] = useState<{ left: number; right: number } | undefined>(undefined);
    // Only for the aurora, which is a render loop and should not run against a field nobody is typing in.
    // `onFocus`/`onBlur` in React are focusin/focusout, so they carry the whole frame's focus, and the
    // `relatedTarget` check keeps a move *within* the frame from reading as a blur. A bar that draws the
    // aurora outside this box needs the same fact, so it also goes out through `onFocusChange`.
    const [focused, setFocused] = useState(false);
    // Outlives `focused` by the fade-out. The lit rule is painted with background layers, and those layers
    // have to stay mounted while the ring shrinks back into its corner — dropped the moment focus left,
    // the ring would snap off instead of fading.
    const [ringVisible, setRingVisible] = useState(false);
    // Drives the cross's label alone: what it does on the next press depends on whether the field holds
    // anything, and a control whose two jobs share one glyph has to say which one it is on.
    const [hasText, setHasText] = useState(false);
    useEffect(() => {
        if (focused) {
            setRingVisible(true);
            return;
        }
        // Mounted for as long as the rule takes to fade, no longer.
        const timer = setTimeout(() => setRingVisible(false), 400);
        return () => clearTimeout(timer);
    }, [focused]);
    const reportFocus = focusGlow !== 'ring';
    const changeFocus = (next: boolean) => {
        setFocused(next);
        onFocusChange?.(next);
    };

    // Where the square rests, read off the spacer: its offsets within the positioned row (the spacer's
    // offsetParent, since nothing between them is positioned). A passive effect, not a layout one: the
    // spacer is a later sibling, and React attaches refs and runs layout effects in one tree-order pass,
    // so at this component's layout effect the spacer's ref is still null. The box stays `invisible` until
    // the first measurement lands, so it is never painted at a stale place — unless the caller also gave
    // rest insets as classes, which then stand in for the first paint. Re-measured whenever the row or
    // the spacer changes size, since the text row beside the spacer reflows with the viewport.
    useEffect(() => {
        const slot = slotRef?.current;
        const row = slot?.offsetParent;
        if (!slot || !(row instanceof HTMLElement)) return;
        const measure = () =>
            setSlotInsets({ left: slot.offsetLeft, right: row.clientWidth - slot.offsetLeft - slot.offsetWidth });
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(row);
        observer.observe(slot);
        return () => observer.disconnect();
    }, [slotRef]);

    /**
     * The lit rule, for the two modes that do not use the plain ring.
     *
     * `underline` grades it: brightest at the bottom-left corner, where the aurora's own light gathers,
     * carried the length of the bottom edge to the far corner, and gone by the top-left. A gradient on a border means one of
     * two things in CSS — `border-image`, which drops the corner radius, or a background painted to the
     * border box with the ground painted back over the padding box, which keeps it. This is the second.
     * An inset shadow, which is what this was, cannot be it: a shadow is drawn inside the padding box, a
     * pixel in from the border it is meant to be, and that pixel shows.
     *
     * The ring fades in and out. A background cannot be faded, but the rule over it can: the gradient is
     * painted in full for as long as it is mounted, under the frame's own opaque grey rule, and it is that
     * rule's colour that moves — to transparent, which lets the light through, and back to grey, which
     * covers it. It used to be *grown* instead, from no size at the bottom-left corner to the whole box,
     * which read as light spreading out of a corner; a plain fade was asked for in its place.
     *
     * Durations are per property rather than one for all: the morph's `left`/`right` keep their 300ms in
     * both directions, while the ring takes 100ms in and four times that out.
     *
     * Applied whenever the field is *shown*, which is not the same as `open`: from the docking width the
     * field is simply there and `open` never becomes true, so keying the rule to it alone left every
     * desktop layout without one.
     */
    const litRule: React.CSSProperties | undefined =
        focusGlow === 'underline' && (open || ringVisible)
            ? {
                  backgroundClip: 'padding-box, border-box',
                  backgroundImage: [
                      // Whatever the frame stands on, painted back over the padding box. Must match what
                      // the classes put there, or the field's middle changes colour on focus.
                      `linear-gradient(${GROUND}, ${GROUND})`,
                      // Wider than tall by design: the horizontal reach carries the light along the whole
                      // bottom edge. A radial gradient paints its last stop beyond the ending shape, so
                      // that stop is what the far corners get, the top-right included.
                      //
                      // The near corner has come down twice, a quarter each time — 0.95 to 0.71 to 0.53 —
                      // while the far one went up to 0.31, and the stops between are re-laid each time so
                      // the ramp never runs downhill and back up. Still the same direction, pouring out of
                      // the bottom-left; what is left of the fall is 0.53 to 0.31 across the whole ring.
                      'radial-gradient(118% 130% at 0% 100%, rgba(29,215,155,0.53) 0%, rgba(29,215,155,0.46) 35%, rgba(29,215,155,0.4) 65%, rgba(29,215,155,0.34) 90%, rgba(29,215,155,0.31) 100%)',
                  ].join(', '),
                  backgroundOrigin: 'border-box',
                  backgroundPosition: '0 0, left bottom',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '100% 100%, 100% 100%',
                  borderColor: focused ? 'transparent' : undefined,
                  transitionDuration: focused ? '300ms, 300ms, 100ms' : '300ms, 300ms, 400ms',
                  transitionProperty: 'left, right, border-color',
              }
            : focusGlow === 'halo'
              ? {
                    borderColor: focused ? 'rgba(29,215,155,0.8)' : undefined,
                    transitionDuration: focused ? '300ms, 300ms, 100ms' : '300ms, 300ms, 400ms',
                    transitionProperty: 'left, right, border-color',
                }
              : undefined;

    // The outline, which `quiet` hides at rest; open, the field's ground and — for the ring treatment —
    // its focus glow.
    const frameClasses = cn(
        'rounded-md border border-solid border-outer-space-700',
        open
            ? cn('bg-heavy-metal-800', focusGlow === 'ring' && 'focus-within:shadow-[0_0_0.4rem_#00d18c]')
            : quiet
              ? 'border-transparent bg-transparent hover:bg-outer-space-800'
              : cn(restFilled ? 'bg-heavy-metal-800' : 'bg-transparent', 'hover:border-outer-space-600'),
    );

    // Whether there is anything to clear, read off the input rather than mirrored in state that would have
    // to be kept in step with a field this component does not own. `input` covers typing, pasting and the
    // clear itself; `open` re-runs it because the input is only in the tree while the field is.
    useEffect(() => {
        const field = fieldRef.current;
        if (!field) return;
        const sync = () => setHasText(Boolean(field.querySelector('input')?.value));
        sync();
        field.addEventListener('input', sync);
        return () => field.removeEventListener('input', sync);
    }, [open]);

    /**
     * The cross, in two acts: the first press empties the field, the second folds it away — and a field
     * with nothing in it folds on the first, since clearing an empty field is a press that does nothing.
     *
     * Clearing goes through the value setter on the prototype and a bubbling `input` event, not through
     * `input.value = ''`: React tracks the last value it wrote and ignores an assignment it did not see,
     * so the field would blank on screen and the search behind it would go on holding the old query.
     */
    const clearOrClose = useCallback(() => {
        const input = fieldRef.current?.querySelector('input');
        if (!input?.value) {
            onOpenChange(false);
            return;
        }
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    }, [onOpenChange]);

    // Flushed, then focused: see the note above. Same path for the tap and for the hotkeys.
    const openNow = useCallback(() => {
        flushSync(() => onOpenChange(true));
        fieldRef.current?.querySelector('input')?.focus();
    }, [onOpenChange]);

    // Focus goes back onto the button when the field folds, so a keyboard user is not dropped on `<body>`.
    // Docked, the button is display:none and `focus()` is a no-op, which is right — the input keeps focus.
    useEffect(() => {
        if (!open && wasOpen.current) toggleRef.current?.focus();
        wasOpen.current = open;
    }, [open]);

    useHotkeys(
        [
            ['/', openNow],
            ['mod+k', openNow],
        ],
        ['INPUT', 'TEXTAREA'],
    );

    return (
        <div
            ref={node => {
                fieldRef.current = node;
                if (frameRef) frameRef.current = node;
            }}
            onKeyDown={event => {
                if (event.key === 'Escape') onOpenChange(false);
            }}
            // The rule belongs to the field, not to the frame around it: the cross lives in here too, and
            // folding the field hands the focus back to that cross — which left the light on over a
            // collapsed square. Focus that lands on the cross does not light it, and focus that moves to
            // the cross puts it out, so the rule fades on the same beat as the fold.
            onFocus={event => {
                if (reportFocus && !toggleRef.current?.contains(event.target)) changeFocus(true);
            }}
            onBlur={event => {
                // A move *within* the frame is not a blur — the network selector lives in here as well,
                // and tabbing to it would otherwise read as leaving.
                const next = event.relatedTarget;
                const stillLit = event.currentTarget.contains(next) && !toggleRef.current?.contains(next);
                if (reportFocus && !stillLit) changeFocus(false);
                if (event.currentTarget.contains(next)) return;
                // An open field with nothing typed in it is a frame in the way of the bar; fold it back
                // into its square. One with text stays, because that text is a search in progress and the
                // results are one click away.
                if (open && !fieldRef.current?.querySelector('input')?.value) onOpenChange(false);
            }}
            // Measured insets apply at rest only; open, the gutter classes take over and the transition runs
            // between the two.
            style={{
                ...litRule,
                ...(!open && slotInsets ? { left: slotInsets.left, right: slotInsets.right } : undefined),
            }}
            className={cn(
                'absolute bottom-0 top-0 z-10 flex items-center overflow-hidden',
                'transition-[left,right,background-color,border-color] duration-300 ease-out motion-reduce:transition-none',
                // Hidden until measured only where there is nothing else to place it by: a caller that
                // also hands in rest insets as classes has given the first paint a place, and the
                // measurement then corrects it rather than revealing it.
                slotRef && !slotInsets && !restClassName && 'invisible',
                'group/frame',
                frameClasses,
                dock.frame,
                focusGlow === 'ring' && dock.ring,
                dockClassName,
                open ? 'left-4 right-4 lg:left-6 lg:right-6' : restClassName,
            )}
        >
            {prefix}

            <div
                className={cn(
                    // `self-stretch` against the frame's `items-center`: the box has to reach the frame's
                    // inner bottom edge, or an underline anchored to it lands a pixel past the clip.
                    'relative min-w-0 flex-1 self-stretch',
                    FILL_SEARCH_HEIGHT_CLASSES,
                    STRIP_SEARCH_FRAME_CLASSES,
                    ALIGN_SEARCH_PANEL_CLASSES,
                    dock.belowDock,
                    // Exactly one of the two, so nothing rides on which display utility Tailwind emits
                    // last; `dock.shown` is responsive and outranks the base `hidden` from the dock up.
                    open ? 'block' : 'hidden',
                    dock.shown,
                )}
            >
                {children}
                {AURORA_ENABLED && focusGlow === 'underline' && (
                    <AuroraField active={focused} band={51} overhang={18} {...aurora} />
                )}
            </div>

            {/* The square's own glyph and, once open, the way back: lens and cross crossfade in one 38px
                slot at the frame's right end. Gone from `dockFrom`, where the field needs no button. */}
            <button
                ref={toggleRef}
                type="button"
                aria-label={open ? (hasText ? 'Clear search' : 'Close search') : 'Open search'}
                aria-expanded={open}
                // Pressed with the field open, the button must not take the focus off it first: a blur with
                // an empty field folds the whole thing, and clearing wants the caret left where it was.
                onMouseDown={event => open && event.preventDefault()}
                onClick={() => (open ? clearOrClose() : openNow())}
                // Over the frame's right end, not a column of it: in flow the button took 38px off the box
                // beside it, and that box is what the results panel takes its width from and what the glow
                // spans — both came out short of the field by the width of this button. `inset-y-0` is the
                // frame's padding box, so the lens centres between its two rules rather than overhanging
                // them. A frame with a suffix keeps the old flow: there the right end is the suffix's.
                //
                // 36 wide and not 38, because `inset-y-0`/`right-0` measure the frame's padding box:
                // collapsed, the frame is 38px *including* its two rules, so a 38px button overhung the
                // left one and the lens sat a pixel left of the square's centre.
                className={cn(
                    'flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-white transition-colors hover:text-heavy-metal-100',
                    suffix ? 'h-[36px] w-full max-w-[38px] shrink-0' : 'absolute inset-y-0 right-0 z-10 w-9',
                    dock.gone,
                )}
            >
                <span className="relative block h-[18px] w-[18px]">
                    <Search
                        size={18}
                        aria-hidden
                        className={cn(
                            'absolute inset-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none',
                            open ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100',
                        )}
                    />
                    <X
                        size={18}
                        aria-hidden
                        className={cn(
                            'absolute inset-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none',
                            open ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0',
                        )}
                    />
                </span>
            </button>

            {suffix}
        </div>
    );
}
