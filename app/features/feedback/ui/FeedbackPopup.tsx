'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type RefObject, useCallback, useRef } from 'react';
import { MessageCircle } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

import type { FeedbackPopupLayout } from '../model/feedback-popup';
import type { FeedbackFormValues } from '../model/use-feedback-form';
import { BugIcon, GlowingBulbIcon } from './feedback-icons';
import {
    CloseButton,
    type FeedbackAction,
    FeedbackCardsLayout,
    type FeedbackLayoutProps,
    FeedbackPillsLayout,
} from './FeedbackPopupLayouts';

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
}: FeedbackPopupProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const closingRef = useRef(false);
    const cards = layout === 'cards';

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
    // it grew out of. After a sent form it runs the other way instead, up and larger as it fades: the user goes
    // through the popup rather than back to the button.
    const close = (outcome: 'dismissed' | 'sent' = 'dismissed') => {
        if (closingRef.current) return;
        closingRef.current = true;
        const finish = () => onOpenChange(false);
        const panel = panelRef.current;
        if (!panel || skipMotion()) {
            finish();
            return;
        }
        playPop(
            { content: contentRef.current, overlay: overlayRef.current, panel },
            outcome === 'sent' ? FLY_THROUGH_FRAME : originFrame(originRef.current, panel),
            'close',
        ).then(finish, finish);
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
            isSubmitting,
            onSubmit: values => {
                void onSubmitFeedback(values).then(sent => sent && close('sent'));
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
                        if (event.target === event.currentTarget) close();
                    }}
                >
                    <div
                        ref={attachPanel}
                        className={cn(
                            'relative max-h-full overflow-y-auto',
                            cards
                                ? // The cards float on the backdrop; the panel itself draws nothing.
                                  'w-[min(880px,calc(100vw-32px))]'
                                : // The Interactive IDL confirmation box: max-w-md, the cluster menu's ground and edge.
                                  'w-[min(448px,calc(100vw-32px))] rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 shadow-2xl',
                        )}
                    >
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
                        {/* The IDL dialog's close mark: a 24px target, equally inset from top and side. */}
                        {!cards && <CloseButton className="right-3.5 top-3.5 h-6 w-6" onClose={() => close()} />}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

const POP_MS = 420;
const POP_EASE = 'cubic-bezier(0.2, 0.9, 0.1, 1)';
// Where a sent popup goes: a little up and larger, faded out, as if passed through. The mirror of shrinking into the
// button, not a different motion.
const FLY_THROUGH_FRAME: Keyframe = { opacity: 0, transform: 'translateY(-24px) scale(1.06)' };
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
    if (typeof Element.prototype.animate !== 'function' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
