import { cubicBezierCss, getMorphTuning } from '../model/morph-tuning';

// REVIEW(HOO-1815): the motion of the review-only answers to a sent form, `card`, `morph` and `swap`. Remove the ones
// the team does not pick, or this whole module if it picks `toast`.
//
// They follow the classic animation principles: slow in and slow out on every leg, each leg with its own curve; squash
// and stretch that keeps the volume (width × height stays near 1); one continuous motion handed from the popup to what
// replaces it, never a stop and a restart; a little follow-through on the text; anticipation before an exit.

/**
 * A sequence that can be cut short: `cutShort` stops it and fades what it moves out from wherever they are, resolving
 * once they are gone; `done` then rejects.
 */
export interface PlayedSequence {
    done: Promise<void>;
    cutShort: () => Promise<unknown>;
}

// Cut short by a click, Escape or Close, a sent answer fades out this fast.
const CUT_SHORT_MS = 100;

/** Stops `running` and fades `elements` out from the frame they are at, holding their place. */
function fadeOutFromHere(elements: (Element | null)[], running: (Animation | undefined)[]): Promise<unknown> {
    // Read before stopping: stopped, they would jump back to where they started.
    const frames = elements.flatMap(element => {
        if (!element) return [];
        const { opacity, transform } = getComputedStyle(element);
        return [{ element, opacity, transform }];
    });
    running.forEach(animation => animation?.cancel());
    return Promise.all(
        frames.map(
            ({ element, opacity, transform }) =>
                element.animate(
                    [
                        { opacity, transform },
                        { opacity: 0, transform },
                    ],
                    {
                        duration: CUT_SHORT_MS,
                        easing: 'ease-out',
                        fill: 'forwards',
                    },
                ).finished,
        ),
    );
}

// The card's Close button and the ring drawn around it, which drains as the auto-close nears.
// Corners rounded by 6px; the length below follows the radius, so the drain keeps one speed round them.
export const SENT_RING = { height: 30, radius: 6, width: 86 } as const;
export const SENT_RING_LENGTH =
    2 * (SENT_RING.width - 2 * SENT_RING.radius) +
    2 * (SENT_RING.height - 2 * SENT_RING.radius) +
    2 * Math.PI * SENT_RING.radius;

// The card: the popup gathers speed upwards and clears the top edge, uncovering the green card beneath it; the note
// fades in over the second half of that flight; the ring drains; then the dim and the card fade together.
const AWAY_MS = 520;
const AWAY_EASE = 'cubic-bezier(0.5, 0, 0.75, 0)';
const NOTE_IN_DELAY_MS = 200;
const NOTE_IN_MS = 320;
const COUNTDOWN_MS = 2000;
const SCREEN_OUT_MS = 300;

/** The card's sent answer, from the popup's flight to the screen fading out. */
export function playSentCard(
    layers: {
        panel: HTMLElement;
        card: HTMLElement;
        note: HTMLElement | null;
        ring: SVGElement | null;
        overlay: HTMLElement | null;
    },
    reduced: boolean,
): PlayedSequence {
    const running: Animation[] = [];
    const run = (element: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
        if (!element) return Promise.resolve();
        const animation = element.animate(keyframes, { fill: 'forwards', ...options });
        running.push(animation);
        return animation.finished;
    };
    const { panel } = layers;
    // Offsets ignore transforms: far enough up that the panel's bottom edge clears the top of the screen.
    const offscreen = `translateY(${-(panel.offsetTop + panel.offsetHeight + 24)}px)`;

    const done = (async () => {
        await Promise.all([
            reduced
                ? run(panel, [{ opacity: 1 }, { opacity: 0 }], { duration: NOTE_IN_MS })
                : run(panel, [{ transform: 'none' }, { transform: offscreen }], {
                      duration: AWAY_MS,
                      easing: AWAY_EASE,
                  }),
            run(
                layers.note,
                [
                    { opacity: 0, transform: reduced ? 'none' : 'translateY(8px)' },
                    { opacity: 1, transform: 'none' },
                ],
                // `both`: hidden through the delay as well.
                {
                    delay: NOTE_IN_DELAY_MS,
                    duration: NOTE_IN_MS,
                    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                    fill: 'both',
                },
            ),
        ]);
        await run(layers.ring, [{ strokeDashoffset: 0 }, { strokeDashoffset: SENT_RING_LENGTH }], {
            duration: COUNTDOWN_MS,
            easing: 'linear',
        });
        await Promise.all([
            run(layers.card, [{ opacity: 1 }, { opacity: 0 }], { duration: SCREEN_OUT_MS, easing: 'ease-in' }),
            run(layers.overlay, [{ opacity: 1 }, { opacity: 0 }], { duration: SCREEN_OUT_MS, easing: 'ease-in' }),
        ]);
    })();

    return {
        cutShort: () => fadeOutFromHere([layers.panel, layers.card, layers.overlay], running),
        done,
    };
}

// The morph, in segments:
// 1. Fold: the popup shrinks to the toast's size while it flies up, gathering speed, into an invisible ceiling
//    20px below the top of the window (the toast's resting top). Its content is gone in the first half, its ground
//    turns into the toast's, so the box that arrives already is the toast.
// 2. Impact: the toast takes over in the same box and squashes against the ceiling, 10% wider and 10% lower.
// 3. Rebound, past the resting shape: 3% narrower and 3% taller.
// 4. Settle into the resting shape.
// The squash and stretch move the box's width, height and padding, not a transform: the padding follows the box in
// proportion while the text keeps its shape. The ceiling holds the top edge, so only the bottom edge moves.
// Each segment's duration and easing come from the design menu's easing editor (model/morph-tuning.ts), read when the
// animation starts.
const IMPACT = { x: 1.1, y: 0.9 };
const REBOUND = { x: 0.97, y: 1.03 };
const TEXT_IN_MS = 270;
const OVERLAY_OUT_MS = 720;
const TOAST_HOLD_MS = 3000;
const TOAST_OUT_MS = 320;

/**
 * The fold, segment 1. `arrived` resolves when the popup reaches the toast's box (and is gone), for the toast to take
 * over; `faded` when the dim is gone too, for the dialog to close.
 */
export function playFoldIntoToast(
    layers: { panel: HTMLElement; content: HTMLElement | null; overlay: HTMLElement | null; toast: HTMLElement },
    reduced: boolean,
): { arrived: Promise<unknown>; faded: Promise<unknown> } {
    const { panel, toast } = layers;
    const fill: FillMode = 'forwards';
    const { fold } = getMorphTuning();
    const faded = layers.overlay?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: OVERLAY_OUT_MS,
        easing: 'ease-out',
        fill,
    }).finished;
    if (reduced) {
        const arrived = panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OVERLAY_OUT_MS, fill }).finished;
        return { arrived, faded: faded ?? arrived };
    }
    // The toast's resting box: it sits on the ceiling.
    const to = toast.getBoundingClientRect();
    // Offsets ignore transforms, so an interrupted animation still measures the resting panel.
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const dx = to.left + to.width / 2 - (panel.offsetLeft + width / 2);
    const dy = to.top + to.height / 2 - (panel.offsetTop + height / 2);
    const panelStyle = getComputedStyle(panel);
    const toastStyle = getComputedStyle(toast);
    const animations = [
        panel.animate(
            [
                { transform: 'none' },
                { transform: `translate(${dx}px, ${dy}px) scale(${to.width / width}, ${to.height / height})` },
            ],
            { duration: fold.ms, easing: cubicBezierCss(fold.easing), fill },
        ),
        panel.animate(
            [
                { backgroundColor: panelStyle.backgroundColor, borderColor: panelStyle.borderColor, opacity: 1 },
                // Gone on arrival, in the frame the toast shows in its place.
                {
                    backgroundColor: toastStyle.backgroundColor,
                    borderColor: toastStyle.borderColor,
                    offset: 0.99,
                    opacity: 1,
                },
                { backgroundColor: toastStyle.backgroundColor, borderColor: toastStyle.borderColor, opacity: 0 },
            ],
            { duration: fold.ms, fill },
        ),
        layers.content?.animate([{ opacity: 1 }, { offset: 0.5, opacity: 0 }, { opacity: 0 }], {
            duration: fold.ms,
            fill,
        }),
    ];
    const arrived = Promise.all(animations.map(animation => animation?.finished));
    return { arrived, faded: faded ?? arrived };
}

/** The toast from the hand-off: segments 2 to 4, a stay, then a dip and out upwards. Resolves when it is gone. */
export async function playToastLife(
    layers: { toast: HTMLElement; text: HTMLElement | null },
    reduced: boolean,
): Promise<void> {
    const { toast } = layers;
    const fill: FillMode = 'forwards';
    if (reduced) {
        await toast.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TEXT_IN_MS * 2, fill }).finished;
    } else {
        const style = getComputedStyle(toast);
        const rest = {
            height: toast.offsetHeight,
            paddingX: parseFloat(style.paddingLeft),
            paddingY: parseFloat(style.paddingTop),
            width: toast.offsetWidth,
        };
        // The box at a shape: width and height scaled, the padding with them.
        const shape = ({ x, y }: { x: number; y: number }): Keyframe => ({
            height: `${rest.height * y}px`,
            opacity: 1,
            paddingBottom: `${rest.paddingY * y}px`,
            paddingLeft: `${rest.paddingX * x}px`,
            paddingRight: `${rest.paddingX * x}px`,
            paddingTop: `${rest.paddingY * y}px`,
            width: `${rest.width * x}px`,
        });
        const { hit, rebound, settle } = getMorphTuning();
        const total = hit.ms + rebound.ms + settle.ms;
        const landing = toast.animate(
            [
                // Arrival: the resting shape, at full speed. Each keyframe's easing runs the segment after it.
                { ...shape({ x: 1, y: 1 }), easing: cubicBezierCss(hit.easing) },
                // Impact: 10% wider, 10% lower.
                { ...shape(IMPACT), easing: cubicBezierCss(rebound.easing), offset: hit.ms / total },
                // Rebound: 3% narrower, 3% taller. Then into rest.
                {
                    ...shape(REBOUND),
                    easing: cubicBezierCss(settle.easing),
                    offset: (hit.ms + rebound.ms) / total,
                },
                shape({ x: 1, y: 1 }),
            ],
            { duration: total },
        );
        layers.text?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TEXT_IN_MS, easing: 'ease-out', fill });
        toast.style.opacity = '1';
        await landing.finished;
    }
    await new Promise(resolve => setTimeout(resolve, TOAST_HOLD_MS));
    await toast.animate(
        reduced
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [
                  { easing: 'cubic-bezier(0.3, 0, 0.6, 1)', opacity: 1, transform: 'none' },
                  // Anticipation: a small dip, squashed, before it goes.
                  {
                      easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)',
                      offset: 0.3,
                      transform: 'translateY(4px) scale(1.04, 0.96)',
                  },
                  { opacity: 0, transform: 'translateY(-36px) scale(0.94, 1.06)' },
              ],
        { duration: TOAST_OUT_MS, fill },
    ).finished;
}

// The swap: the popup turns green with the note at once, holds it, then leaves the way the popup closes: smaller,
// rising and fading on the open's curve played backwards, the dim going over the last part.
const SWAP_HOLD_MS = 2000;
const SWAP_OUT_MS = 300;
const SWAP_END_FRAME: Keyframe = { opacity: 0, transform: 'translateY(-24px) scale(0.94)' };

/**
 * The swap's hold and exit: the popup holds the note while the ring round Close drains, then leaves. `easing` is the popup's open curve. `cutShort` is for
 * a click that closes the popup early.
 */
export function playSwapExit(
    layers: { panel: HTMLElement; overlay: HTMLElement | null; ring: SVGElement | null },
    reduced: boolean,
    easing: string,
): PlayedSequence {
    // Reversed like the popup's close; `both` holds the resting frame through the hold and the end frame until the
    // dialog unmounts.
    const timing: KeyframeAnimationOptions = {
        delay: SWAP_HOLD_MS,
        direction: 'reverse',
        duration: SWAP_OUT_MS,
        fill: 'both',
    };
    const animations = [
        layers.panel.animate([reduced ? { opacity: 0 } : SWAP_END_FRAME, { opacity: 1, transform: 'none' }], {
            ...timing,
            easing,
        }),
        layers.overlay?.animate([{ opacity: 0 }, { offset: 0.6, opacity: 1 }, { opacity: 1 }], timing),
        // Empty as the popup starts to leave.
        layers.ring?.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: SENT_RING_LENGTH }], {
            duration: SWAP_HOLD_MS,
            easing: 'linear',
            fill: 'forwards',
        }),
    ];
    return {
        cutShort: () => fadeOutFromHere([layers.panel, layers.overlay], animations),
        done: Promise.all(animations.map(animation => animation?.finished)).then(() => undefined),
    };
}
