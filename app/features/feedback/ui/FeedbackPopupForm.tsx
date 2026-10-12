'use client';

import { type ReactNode, useId, useRef, useState } from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { Input, inputVariants } from '@/app/components/shared/ui/input';
import { Label } from '@/app/components/shared/ui/label';
import { cn } from '@/app/components/shared/utils';

import { readFeedbackDraft, saveFeedbackDraft } from '../model/feedback-draft';
import { FEEDBACK_ERROR_FADE_MS, FEEDBACK_ERROR_SHOWN_MS, type FeedbackFormValues } from '../model/use-feedback-form';
import { BaseStarRating } from './BaseStarRating';
import { SendingRunner } from './SendingRunner';

export interface FeedbackPopupFormProps {
    isSubmitting: boolean;
    onSubmit: (values: FeedbackFormValues) => void;
    /** Why the last send failed, written beside Submit. */
    error?: { title: string; description: string };
    /** Called once the error has faded out, for the caller to take it away. */
    onErrorFaded?: () => void;
    /** Drawn above the stars and grouped with them, so the rating reads as part of the heading. */
    heading?: ReactNode;
    /** Shows the stars as a labelled field like the others, instead of tucking them under a heading. */
    labelledRating?: boolean;
    submitClassName?: string;
}

export function FeedbackPopupForm({
    isSubmitting,
    onSubmit,
    error,
    onErrorFaded,
    heading,
    labelledRating = false,
    submitClassName,
}: FeedbackPopupFormProps) {
    // The unsent draft survives a reload, and a failed send, which keeps the form as it is.
    const [draft] = useState(readFeedbackDraft);
    const [rating, setRating] = useState(draft?.rating ?? 0);
    const formRef = useRef<HTMLFormElement>(null);
    const id = useId();
    const saveDraft = (nextRating = rating) => {
        if (formRef.current) saveFeedbackDraft(readValues(formRef.current, nextRating));
    };
    // BaseStarRating centres itself; the popup aligns it with the left edge of the fields.
    // -ml-1 offsets the p-1 hit area around each star, so the first star sits on the field edge.
    const stars = (
        <div className="-ml-1 [&>[role=radiogroup]]:justify-start">
            <BaseStarRating
                onChange={value => {
                    setRating(value);
                    saveDraft(value);
                }}
                value={rating}
            />
        </div>
    );

    return (
        <form
            className="flex flex-col gap-5"
            onChange={() => saveDraft()}
            onSubmit={event => {
                event.preventDefault();
                // One send at a time; Enter in the contact field submits even with the button disabled.
                if (isSubmitting) return;
                onSubmit(readValues(event.currentTarget, rating));
            }}
            ref={formRef}
        >
            {/* Unlabelled, the stars belong to the heading above them, not to the fields below: 12px up, 20px
                down. Without a heading of its own, -mt-2 tucks them under whatever sits above the form, since
                every container here spaces its children by at least 16px. */}
            {!labelledRating && (
                <div className={cn('flex flex-col gap-3', !heading && '-mt-2')}>
                    {heading}
                    {stars}
                </div>
            )}
            <div className="flex flex-col gap-4">
                {labelledRating && (
                    // The radiogroup names itself "Rating", so the visible label is not tied to a control.
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-none text-neutral-200">
                            Rating <span className="font-normal text-outer-space-300">(optional)</span>
                        </span>
                        {stars}
                    </div>
                )}
                <div className="flex flex-col gap-1.5">
                    <Label className="text-neutral-200" htmlFor={`${id}-message`}>
                        Feedback
                    </Label>
                    <textarea
                        className={cn(inputVariants({ variant: 'dark' }), 'h-auto resize-none', FIELD_BORDER)}
                        defaultValue={draft?.message}
                        id={`${id}-message`}
                        // Sentry rejects oversized events, and breadcrumbs add to the event size.
                        maxLength={4096}
                        name="message"
                        required
                        rows={4}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label className="text-neutral-200" htmlFor={`${id}-contact`}>
                        X handle <span className="font-normal text-outer-space-300">(optional)</span>
                    </Label>
                    {/* X handles have at most 15 characters, plus an optional @. */}
                    <Input
                        className={FIELD_BORDER}
                        defaultValue={draft?.contact}
                        id={`${id}-contact`}
                        maxLength={16}
                        name="contact"
                        variant="dark"
                    />
                    <p className="m-0 text-xs text-outer-space-300">So we can reach out if we have any questions</p>
                </div>
                {/* lg, 40px: the height of the GitHub buttons beside it and of the app's dialog actions. */}
                <div className="flex items-center gap-3">
                    {/* The dash runs round this wrapper, not inside the button: the disabled button fades, and the
                        dash would fade with it. */}
                    <span className="relative inline-flex shrink-0 self-start">
                        <Button
                            className={submitClassName}
                            disabled={isSubmitting}
                            size="lg"
                            type="submit"
                            variant="accent"
                        >
                            {/* Every label it can show, stacked: the button takes the widest one, so it keeps its
                                width as the label changes. Only the current one is read out. */}
                            <span className="grid justify-items-center">
                                {SUBMIT_LABELS.map(option => (
                                    <span
                                        key={option}
                                        aria-hidden={option !== (isSubmitting ? 'Sending…' : 'Submit')}
                                        className={cn(
                                            'col-start-1 row-start-1',
                                            option !== (isSubmitting ? 'Sending…' : 'Submit') && 'invisible',
                                        )}
                                    >
                                        {option}
                                    </span>
                                ))}
                            </span>
                        </Button>
                        {/* The button's corners: `rounded`, 4px. */}
                        {isSubmitting && <SendingRunner radius={4} />}
                    </span>
                    {error && (
                        <p
                            role="alert"
                            // Stays, then fades out, and the caller takes it away once faded; `forwards` holds it
                            // faded meanwhile. Under the pointer the animation is off: the error shows in full and
                            // stays, and it starts over once the pointer leaves.
                            className="m-0 min-w-0 text-xs text-destructive animate-out fade-out hover:![animation:none]"
                            onAnimationEnd={onErrorFaded}
                            style={{
                                animationDelay: `${FEEDBACK_ERROR_SHOWN_MS}ms`,
                                animationDuration: `${FEEDBACK_ERROR_FADE_MS}ms`,
                                animationFillMode: 'forwards',
                            }}
                        >
                            {error.title}. {error.description}
                        </p>
                    )}
                </div>
            </div>
        </form>
    );
}

// The label does not change with failed attempts: the error beside it offers the retry.
const SUBMIT_LABELS = ['Submit', 'Sending…'] as const;

function readValues(form: HTMLFormElement, rating: number): FeedbackFormValues {
    const data = new FormData(form);
    return {
        contact: String(data.get('contact') || '') || undefined,
        message: String(data.get('message') || ''),
        rating: rating || undefined,
    };
}

// The dark input variant borders with outer-space-950, which nearly vanishes on the popup's ground;
// outer-space-800 is the border the popup's own cards use.
const FIELD_BORDER = '!border-outer-space-800';
