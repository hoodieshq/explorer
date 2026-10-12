'use client';

import { cva } from 'class-variance-authority';
import { type RefObject } from 'react';

import { SENT_RING, SENT_RING_LENGTH } from './feedback-sent-motion';

// REVIEW(HOO-1815): the Close of the `card` and `swap` sent answers; remove with them.

const closeVariants = cva(
    'relative flex cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-sm font-medium focus-visible:outline-none focus-visible:ring-2',
    {
        variants: {
            // `light` on the dark green card, `dark` on the brand green popup. Dark is faint, 40%, so it does not compete
            // with the note; full under the pointer.
            tone: {
                dark: 'text-dark-background/40 hover:text-dark-background focus-visible:ring-dark-background',
                light: 'text-white focus-visible:ring-dark-accent',
            },
        },
    },
);

const ringVariants = cva('', {
    variants: { tone: { dark: 'text-dark-background/40', light: 'text-dark-accent' } },
});

/** Close, with a ring round it that the caller drains as the auto-close nears (`ringRef`, its stroke-dashoffset). */
export function SentCloseButton({
    buttonRef,
    ringRef,
    tone,
    onClose,
}: {
    buttonRef?: RefObject<HTMLButtonElement | null>;
    ringRef: RefObject<SVGRectElement | null>;
    tone: 'dark' | 'light';
    onClose: () => void;
}) {
    return (
        <button
            ref={buttonRef}
            type="button"
            className={closeVariants({ tone })}
            style={{ height: SENT_RING.height + 2, width: SENT_RING.width + 2 }}
            onClick={onClose}
        >
            Close
            <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-visible"
                height={SENT_RING.height + 2}
                width={SENT_RING.width + 2}
            >
                <rect
                    ref={ringRef}
                    className={ringVariants({ tone })}
                    fill="none"
                    height={SENT_RING.height}
                    rx={SENT_RING.radius}
                    stroke="currentColor"
                    strokeDasharray={SENT_RING_LENGTH}
                    strokeLinecap="round"
                    strokeWidth={1.5}
                    width={SENT_RING.width}
                    x={1}
                    y={1}
                />
            </svg>
        </button>
    );
}
