'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type RefObject, useCallback, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { CheckCircle, MessageCircle } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

import type { FeedbackPopupLayout, FeedbackResponseStyle } from '../model/feedback-popup';
import { FEEDBACK_SEND_ERROR, FEEDBACK_SENT, type FeedbackFormValues } from '../model/use-feedback-form';
import { BugIcon, GlowingBulbIcon } from './feedback-icons';
import {
    type PlayedSequence,
    playFoldIntoToast,
    playSentCard,
    playSwapExit,
    playToastLife,
} from './feedback-sent-motion';
import {
    CloseButton,
    type FeedbackAction,
    FeedbackCardsLayout,
    type FeedbackLayoutProps,
    FeedbackPillsLayout,
} from './FeedbackPopupLayouts';
import { FeedbackSentToast } from './FeedbackSentToast';
import { canAnimate, prefersReducedMotion } from './motion-support';
import { SentCloseButton } from './SentCloseButton';

// Every secondary grey in the popup (descriptions, hints, "(optional)", the close mark, the external arrows) is
// outer-space-300, the key-value label colour, so the popup speaks the same secondary tone as the pages.

export interface FeedbackPopupProps {
    open: boolean;
    /** Called with `false` only after the exit animation, so the origin reappears as the popup lands on it. */
    onOpenChange: (open: boolean) => void;
    /** The element the popup grows out of and lands back on. */
    originRef: RefObject<HTMLElement | null>;
    layout: FeedbackPopupLayout;
    bugReportUrl: string;
    ideasUrl: string;
    /** Sends the form; resolves to whether it was sent. Unset hides the form (no Sentry DSN). */
    onSubmitFeedback?: (values: FeedbackFormValues) => Promise<boolean>;
    isSubmitting?: boolean;
    /** REVIEW(HOO-1815): how the popup answers a send; see FeedbackResponseStyle. */
    responseStyle?: FeedbackResponseStyle;
}

export function FeedbackPopup({
    open,
    onOpenChange,
    originRef,
    layout,
    bugReportUrl,
    ideasUrl,
    onSubmitFeedback,
    isSubmitting = false,
    responseStyle = 'toast',
}: FeedbackPopupProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const closingRef = useRef(false);
    const [sendFailed, setSendFailed] = useState(false);
    // REVIEW(HOO-1815): the card's green card, laid exactly where the popup stood; set once the feedback is sent.
    const [sentBox, setSentBox] = useState<{ top: number; left: number; width: number; height: number }>();
    const sentCardRef = useRef<HTMLDivElement | null>(null);
    const sentNoteRef = useRef<HTMLDivElement | null>(null);
    const sentRingRef = useRef<SVGRectElement | null>(null);
    const sentCloseRef = useRef<HTMLButtonElement | null>(null);
    // While the card's sent answer plays: ends it at once, for a click anywhere, Escape or Close.
    const endSentRef = useRef<(() => void) | undefined>(undefined);
    const sentToastRef = useRef<HTMLDivElement | null>(null);
    const sentToastTextRef = useRef<HTMLDivElement | null>(null);
    // The morph's toast outlives the dialog, so it has its own flag rather than `open`.
    const [sentToast, setSentToast] = useState(false);
    const cards = layout === 'cards';
    const onCard = responseStyle === 'card';
    const morph = responseStyle === 'morph';
    // REVIEW(HOO-1815): the swap's note has replaced the popup's content.
    const [swapped, setSwapped] = useState(false);
    const swapCloseRef = useRef<HTMLButtonElement | null>(null);
    const swapRingRef = useRef<SVGRectElement | null>(null);

    // Closes the dialog and leaves nothing of this visit for the next open. Reset here, not on open: the next open
    // centres the popup by its first frame's height, so a note or an error left from this visit would set it off
    // centre, and the form arriving a frame later would push it down and past the bottom.
    const finish = () => {
        endSentRef.current = undefined;
        setSendFailed(false);
        setSentBox(undefined);
        setSwapped(false);
        onOpenChange(false);
    };

    // A callback ref: Radix mounts the portal a tick after `open` flips, so an effect would miss the node.
    // Children refs attach before the parent's, so the content and overlay refs are already set.
    const attachPanel = useCallback(
        (node: HTMLDivElement | null) => {
            panelRef.current = node;
            if (!node) return;
            closingRef.current = false;
            pinToCentre(node);
            if (skipMotion()) return;
            playPop(
                { content: contentRef.current, overlay: overlayRef.current, panel: node },
                originFrame(originRef.current, node),
                'open',
            );
        },
        [originRef],
    );

    // The close is the open played backwards: the same timing and curve, so the popup shrinks back into the element
    // it grew out of. After a sent form it heads down to the toast instead (see playSend), while the toast drops into
    // place from above: the popup turns into the toast rather than going back to the button. On the card, a sent popup
    // flies off the top of the screen over its "Feedback sent!" note instead (see playSendAway).
    const close = (outcome: 'dismissed' | 'sent' = 'dismissed') => {
        if (endSentRef.current) {
            endSentRef.current();
            return;
        }
        if (closingRef.current) return;
        closingRef.current = true;
        const panel = panelRef.current;
        if (outcome === 'sent' && morph) {
            morphIntoToast(panel);
            return;
        }
        if (outcome === 'sent' && responseStyle === 'swap') {
            swapToSent(panel);
            return;
        }
        if (outcome === 'sent' && onCard) {
            showSentCard(panel);
            return;
        }
        if (!panel || skipMotion()) {
            finish();
            return;
        }
        const played =
            outcome === 'sent'
                ? playSend({ overlay: overlayRef.current, panel })
                : playPop(
                      { content: contentRef.current, overlay: overlayRef.current, panel },
                      originFrame(originRef.current, panel),
                      'close',
                  );
        played.then(finish, finish);
    };

    // REVIEW(HOO-1815): the morph's sent exit. The dialog closes once the popup has folded into the toast; the toast
    // then bounces, stays a while and leaves on its own.
    const morphIntoToast = (panel: HTMLElement | null) => {
        // jsdom has no Web Animations; there the popup just closes.
        if (!panel || !canAnimate()) {
            finish();
            return;
        }
        // Mounted now, so the morph can aim at the toast's resting box.
        flushSync(() => setSentToast(true));
        const toast = sentToastRef.current;
        if (!toast) {
            finish();
            return;
        }
        const reduced = prefersReducedMotion();
        const { arrived, faded } = playFoldIntoToast(
            { content: contentRef.current, overlay: overlayRef.current, panel, toast },
            reduced,
        );
        // The dialog closes once the dim is gone; the toast lives on outside it.
        faded.then(finish, finish);
        arrived
            .then(() => playToastLife({ text: sentToastTextRef.current, toast }, reduced))
            .catch(finish)
            .finally(() => setSentToast(false));
    };

    // REVIEW(HOO-1815): runs a sent answer that a click, Escape or Close can cut short, then closes the dialog. Cut short,
    // it fades out in 0.1s from wherever it is. Played out, its animations are left holding their last frame until the
    // dialog unmounts: stopping them then would put the popup back in full view for a frame before it goes, a blink.
    const playCutShort = (played: PlayedSequence) => {
        let ended = false;
        const end = (early: boolean) => {
            if (ended) return;
            ended = true;
            endSentRef.current = undefined;
            if (early) played.cutShort().then(finish, finish);
            else finish();
        };
        endSentRef.current = () => end(true);
        played.done.then(
            () => end(false),
            () => end(false),
        );
    };

    // REVIEW(HOO-1815): the swap's sent answer. The note replaces the content at once, in a popup held at its height so
    // it does not jump; a moment later the popup rises and fades.
    const swapToSent = (panel: HTMLElement | null) => {
        if (!panel) {
            finish();
            return;
        }
        panel.style.height = `${panel.offsetHeight}px`;
        // Now, not on the next render: the hold is timed from here.
        flushSync(() => setSwapped(true));
        // The focus was on Submit, which the note replaced; Close is the one control left, so Enter closes too.
        swapCloseRef.current?.focus();
        // jsdom has no Web Animations; there the popup just closes.
        if (!canAnimate()) {
            finish();
            return;
        }
        const played: PlayedSequence = playSwapExit(
            { overlay: overlayRef.current, panel, ring: swapRingRef.current },
            prefersReducedMotion(),
            POP_EASE,
        );
        // A click anywhere or Escape ends it at once, as on the card.
        playCutShort(played);
    };

    // REVIEW(HOO-1815): the card's sent answer. The popup flies off the top and uncovers a green card of its size with
    // the note and a Close button; the ring around Close drains until the screen fades on its own. Any click, Escape or
    // Close ends it at once.
    const showSentCard = (panel: HTMLElement | null) => {
        // jsdom has no Web Animations; there the popup just closes.
        if (!panel || !canAnimate()) {
            finish();
            return;
        }
        // Offsets, not the box on screen: the content layer is fixed at the viewport's top, and they ignore transforms.
        flushSync(() =>
            setSentBox({
                height: panel.offsetHeight,
                left: panel.offsetLeft,
                top: panel.offsetTop,
                width: panel.offsetWidth,
            }),
        );
        const card = sentCardRef.current;
        if (!card) {
            finish();
            return;
        }
        // The focus was on Submit, in the popup that leaves; Close is the one control left, so Enter closes too.
        sentCloseRef.current?.focus();
        // The note is the only word that the feedback went, so asking for less motion swaps the flight for a fade
        // rather than skipping it.
        const played: PlayedSequence = playSentCard(
            { card, note: sentNoteRef.current, overlay: overlayRef.current, panel, ring: sentRingRef.current },
            prefersReducedMotion(),
        );
        playCutShort(played);
    };

    const actions: FeedbackAction[] = [
        ...(onSubmitFeedback
            ? [
                  {
                      Icon: MessageCircle,
                      description: 'Rate the explorer and tell us what to improve.',
                      id: 'feedback' as const,
                      onSelect: () => undefined,
                      title: 'Your thoughts',
                  },
              ]
            : []),
        {
            Icon: GlowingBulbIcon,
            description: 'Describe a feature you are missing.',
            href: ideasUrl,
            id: 'idea',
            onSelect: () => close(),
            title: 'Idea',
        },
        {
            Icon: BugIcon,
            description: 'Tell us what broke and how to reproduce it.',
            href: bugReportUrl,
            id: 'bug',
            onSelect: () => close(),
            title: 'Bug',
        },
    ];

    const layoutProps: FeedbackLayoutProps = {
        actions,
        form: onSubmitFeedback && {
            error: responseStyle !== 'toast' && sendFailed ? FEEDBACK_SEND_ERROR : undefined,
            isSubmitting,
            // The form fades the error out, and holds it while the pointer is on it.
            onErrorFaded: () => setSendFailed(false),
            // The popup waits for the send on its Submit button and leaves only once the feedback is sent, as the
            // hook raises the sent toast; a failed send keeps the popup and the typed text.
            onSubmit: values => {
                setSendFailed(false);
                void onSubmitFeedback(values).then(delivered => {
                    if (delivered) {
                        close('sent');
                        return;
                    }
                    setSendFailed(true);
                });
            },
        },
        onClose: () => close(),
    };

    return (
        <DialogPrimitive.Root
            open={open}
            onOpenChange={next => {
                if (!next) close();
            }}
        >
            <DialogPrimitive.Portal>
                {/* Oversized on purpose: Safari on iOS 26 draws the page under its floating address bar, past the
                    edge of an inset-0 layer, so the dim reaches half a screen beyond both edges. */}
                <DialogPrimitive.Overlay
                    ref={overlayRef}
                    className="fixed inset-x-0 -top-[50vh] z-50 h-[200vh] bg-black/70"
                />
                <DialogPrimitive.Content
                    // A pinned panel hangs from the top; see pinToCentre. The vertical padding is symmetric, so the
                    // panel lands on the true centre.
                    className="fixed inset-0 z-50 flex items-start justify-center px-4 py-24 outline-none"
                    // The content layer fills the screen, so a click on the backdrop lands here.
                    onClick={event => {
                        // While the card's sent answer shows, a click anywhere closes it.
                        if (endSentRef.current || event.target === event.currentTarget) close();
                    }}
                >
                    {/* REVIEW(HOO-1815): the card's green card, where the popup stood and beneath it, so the popup
                        uncovers it as it flies off. The note's text appears only then, so it is announced then. */}
                    {sentBox && (
                        <div
                            ref={sentCardRef}
                            className="absolute flex flex-col items-center gap-6 overflow-hidden rounded-lg border border-solid border-dark-accent/60 bg-green-950 p-6 text-center shadow-2xl"
                            style={sentBox}
                        >
                            {/* The note takes the space above Close and centres in it; Close sits at the very bottom. */}
                            <div
                                ref={sentNoteRef}
                                role="status"
                                className="flex flex-1 flex-col items-center justify-center gap-2"
                            >
                                <CheckCircle className="mb-1 text-dark-accent" size={48} aria-hidden="true" />
                                <p className="m-0 text-4xl font-semibold leading-tight text-dark-accent">
                                    {FEEDBACK_SENT.title}
                                </p>
                                <p className="m-0 text-lg text-neutral-200">{FEEDBACK_SENT.description}</p>
                            </div>
                            {/* The ring drains as the auto-close nears. */}
                            <SentCloseButton
                                buttonRef={sentCloseRef}
                                ringRef={sentRingRef}
                                tone="light"
                                onClose={() => close()}
                            />
                        </div>
                    )}
                    <div
                        ref={attachPanel}
                        className={cn(
                            'relative max-h-full overflow-y-auto',
                            cards
                                ? // The cards float on the backdrop; the panel itself draws nothing.
                                  'w-[min(880px,calc(100vw-32px))]'
                                : // The Interactive IDL confirmation box: max-w-md, the cluster menu's ground and edge.
                                  'w-[min(448px,calc(100vw-32px))]',
                            // The swap's note sits on the brand green, in the cards layout too.
                            swapped
                                ? // The ground turns green over 0.2s; the transition is set with the colour, so it runs.
                                  'cursor-pointer rounded-lg border border-solid border-dark-accent bg-dark-accent shadow-2xl transition-[background-color,border-color] duration-200'
                                : !cards &&
                                      'rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 shadow-2xl',
                        )}
                    >
                        {swapped ? (
                            <div className="flex h-full flex-col items-center p-6 text-center">
                                {/* The dialog keeps its name while the note shows. */}
                                <DialogPrimitive.Title className="sr-only">Feedback</DialogPrimitive.Title>
                                <DialogPrimitive.Description className="sr-only">
                                    {FEEDBACK_SENT.description}
                                </DialogPrimitive.Description>
                                {/* In with the green, so the dark text never sits on the dark ground. The note takes the
                                    space above Close and centres in it. */}
                                <div
                                    role="status"
                                    className="flex flex-1 flex-col items-center justify-center gap-2 animate-in fade-in [animation-duration:200ms]"
                                >
                                    <CheckCircle className="mb-1 text-dark-background" size={48} aria-hidden="true" />
                                    <p className="m-0 text-3xl font-semibold leading-tight text-dark-background">
                                        {FEEDBACK_SENT.title}
                                    </p>
                                    <p className="m-0 text-base text-dark-background">{FEEDBACK_SENT.description}</p>
                                </div>
                                {/* At the very bottom, as on the card; its ring drains until the popup leaves. */}
                                <SentCloseButton
                                    buttonRef={swapCloseRef}
                                    ringRef={swapRingRef}
                                    tone="dark"
                                    onClose={() => close()}
                                />
                            </div>
                        ) : (
                            <div ref={contentRef} className={cn('flex flex-col', !cards && 'gap-3 p-5 pt-6')}>
                                {/* The cards carry their own headings, so there the dialog's name is for screen readers. */}
                                <div className={cn('flex flex-col gap-1.5 pr-6', cards && 'sr-only')}>
                                    <DialogPrimitive.Title className="m-0 text-xl font-medium leading-snug text-white">
                                        Feedback
                                    </DialogPrimitive.Title>
                                    <DialogPrimitive.Description className="m-0 text-sm text-outer-space-300">
                                        What would you like to share?
                                    </DialogPrimitive.Description>
                                </div>
                                {cards ? (
                                    <FeedbackCardsLayout {...layoutProps} />
                                ) : (
                                    <FeedbackPillsLayout {...layoutProps} />
                                )}
                            </div>
                        )}
                        {/* The IDL dialog's close mark: a 24px target, equally inset from top and side. */}
                        {!cards && !swapped && (
                            <CloseButton className="right-3.5 top-3.5 h-6 w-6" onClose={() => close()} />
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
            {sentToast &&
                createPortal(
                    <FeedbackSentToast className="z-[60]" textRef={sentToastTextRef} toastRef={sentToastRef} />,
                    document.body,
                )}
        </DialogPrimitive.Root>
    );
}

const POP_MS = 300;
const POP_EASE = 'cubic-bezier(0.2, 0.9, 0.1, 1)';
// A sent popup heads for the toast at the bottom of the screen: part of the way there, smaller, and gone by 60% of the
// way, so it never arrives; the toast takes over. Its own motion, not the open reversed: reversed, the open's
// fast-then-slow curve holds the popup still and opaque for most of the time, then throws it down in the last third.
const SEND_MS = 300;
// Ease-in: the popup gathers speed as it leaves, the way it falls away.
const SEND_EASE = 'cubic-bezier(0.4, 0, 1, 1)';
const SEND_FADED_AT = 0.6;
const TO_TOAST_TRAVEL = 0.4;
const TO_TOAST_SCALE = 0.85;
// Without an origin to grow out of (a hidden one), the popup just fades in from slightly smaller.
const FALLBACK_MS = 160;

/**
 * Centres the panel once, by its height at that moment, then keeps its top edge where it landed. Switching
 * topics changes the panel's height, and it then grows or shrinks downwards, so the switch at its top stays
 * put instead of riding a re-centring panel.
 */
function pinToCentre(panel: HTMLElement) {
    const container = panel.parentElement;
    if (!container) return;
    panel.style.marginTop = '0px';
    const styles = getComputedStyle(container);
    const room = container.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    const top = Math.max(0, (room - panel.offsetHeight) / 2);
    panel.style.marginTop = `${top}px`;
    // The margin eats into the room max-h-full assumed, so a panel that grows later still fits the viewport.
    panel.style.maxHeight = `calc(100% - ${top}px)`;
}

/** Plays a sent popup's exit: down towards the toast and smaller, fading out early, with the dim. */
function playSend(layers: { panel: HTMLElement; overlay: HTMLElement | null }): Promise<unknown> {
    // A finished exit must hold its end frame until the dialog unmounts.
    const timing: KeyframeAnimationOptions = { duration: SEND_MS, fill: 'forwards' };
    const animations = [
        layers.panel.animate([{ transform: 'none' }, { transform: toToastTransform(layers.panel) }], {
            ...timing,
            easing: SEND_EASE,
        }),
        layers.panel.animate([{ opacity: 1 }, { offset: SEND_FADED_AT, opacity: 0 }, { opacity: 0 }], timing),
        ...(layers.overlay ? [layers.overlay.animate([{ opacity: 1 }, { opacity: 0 }], timing)] : []),
    ];
    return Promise.all(animations.map(animation => animation.finished));
}

/** Part of the way down to the toast at the bottom of the screen, smaller. */
function toToastTransform(panel: HTMLElement): string {
    // Offsets ignore transforms, as in morphTransform; the content layer is fixed at the viewport's top.
    const centre = panel.offsetTop + panel.offsetHeight / 2;
    const dy = (window.innerHeight - centre) * TO_TOAST_TRAVEL;
    return `translateY(${dy}px) scale(${TO_TOAST_SCALE})`;
}

/** The outer frame of the grow-out-of-the-origin animation, or unset when the origin is hidden. */
function originFrame(origin: HTMLElement | null, panel: HTMLElement): Keyframe | undefined {
    const transform = morphTransform(origin, panel);
    return transform ? { opacity: 0.9, transform } : undefined;
}

/** The transform that lays the panel exactly over the origin element: the start of the open, the end of the close. */
function morphTransform(origin: HTMLElement | null, panel: HTMLElement): string | undefined {
    const from = origin?.getBoundingClientRect();
    // A hidden origin (display: none) has no box to grow out of.
    if (!from || from.width === 0) return undefined;

    // Offsets ignore transforms, so a close that interrupts the open still measures the resting panel.
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const dx = from.left + from.width / 2 - (panel.offsetLeft + width / 2);
    const dy = from.top + from.height / 2 - (panel.offsetTop + height / 2);
    return `translate(${dx}px, ${dy}px) scale(${from.width / width}, ${from.height / height})`;
}

/**
 * Plays the popup's appearance, or the same animation backwards for `close`. The panel grows out of the origin
 * (or fades in from slightly smaller without one), the content shows over the last two thirds, the dim over the
 * first 60%; reversed, each part runs the mirror of its open.
 */
function playPop(
    layers: { panel: HTMLElement; content: HTMLElement | null; overlay: HTMLElement | null },
    /** The panel's outer frame: where an open starts and a close ends. Unset falls back to a short fade. */
    edge: Keyframe | undefined,
    direction: 'open' | 'close',
): Promise<unknown> {
    const timing: KeyframeAnimationOptions = {
        direction: direction === 'open' ? 'normal' : 'reverse',
        duration: edge ? POP_MS : FALLBACK_MS,
        // A finished close must hold its end frame until the dialog unmounts.
        fill: direction === 'close' ? 'forwards' : 'none',
    };
    const animations = [
        layers.panel.animate([edge ?? { opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], {
            ...timing,
            easing: edge ? POP_EASE : 'linear',
        }),
        ...(edge && layers.content
            ? [layers.content.animate([{ opacity: 0 }, { offset: 0.35, opacity: 0 }, { opacity: 1 }], timing)]
            : []),
        ...(layers.overlay
            ? [layers.overlay.animate([{ opacity: 0 }, { offset: 0.6, opacity: 1 }, { opacity: 1 }], timing)]
            : []),
    ];
    return Promise.all(animations.map(animation => animation.finished));
}

/** True when the user asks for less motion, or the environment has no Web Animations (jsdom). */
function skipMotion(): boolean {
    return !canAnimate() || prefersReducedMotion();
}
