'use client';

import { type RefObject } from 'react';
import { CheckCircle } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

import { FEEDBACK_SENT } from '../model/use-feedback-form';

/**
 * REVIEW(HOO-1815): the morph's toast, also played by the easing editor's preview. Its top, 20px down, is the ceiling
 * the popup flies into. Centred by margins, not a transform, as its width changes while it squashes; the text stays
 * centred in its height too. Hidden until the morph shows it.
 */
export function FeedbackSentToast({
    toastRef,
    textRef,
    className,
}: {
    toastRef: RefObject<HTMLDivElement | null>;
    textRef: RefObject<HTMLDivElement | null>;
    className?: string;
}) {
    return (
        <div
            ref={toastRef}
            role="status"
            className={cn(
                'pointer-events-none fixed inset-x-0 top-5 mx-auto flex w-[min(320px,calc(100vw-32px))] origin-top flex-col justify-center rounded-lg border border-solid border-dark-accent bg-dark-accent px-4 py-3 text-center opacity-0 shadow-2xl',
                className,
            )}
        >
            <div ref={textRef} className="flex flex-col items-center gap-0.5">
                <p className="m-0 flex items-center gap-1.5 text-base font-semibold text-dark-background">
                    <CheckCircle size={16} aria-hidden="true" />
                    {FEEDBACK_SENT.title}
                </p>
                <p className="m-0 text-sm text-dark-background">{FEEDBACK_SENT.description}</p>
            </div>
        </div>
    );
}
