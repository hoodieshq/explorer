'use client';

import { type ReactNode, useId, useState } from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { Input, inputVariants } from '@/app/components/shared/ui/input';
import { Label } from '@/app/components/shared/ui/label';
import { cn } from '@/app/components/shared/utils';

import type { FeedbackFormValues } from '../model/use-feedback-form';
import { BaseStarRating } from './BaseStarRating';

export interface FeedbackPopupFormProps {
    isSubmitting: boolean;
    onSubmit: (values: FeedbackFormValues) => void;
    /** Drawn above the stars and grouped with them, so the rating reads as part of the heading. */
    heading?: ReactNode;
    /** Shows the stars as a labelled field like the others, instead of tucking them under a heading. */
    labelledRating?: boolean;
    submitClassName?: string;
}

export function FeedbackPopupForm({
    isSubmitting,
    onSubmit,
    heading,
    labelledRating = false,
    submitClassName,
}: FeedbackPopupFormProps) {
    const [rating, setRating] = useState(0);
    const id = useId();
    // BaseStarRating centres itself; the popup aligns it with the left edge of the fields.
    // -ml-1 offsets the p-1 hit area around each star, so the first star sits on the field edge.
    const stars = (
        <div className="-ml-1 [&>[role=radiogroup]]:justify-start">
            <BaseStarRating onChange={setRating} value={rating} />
        </div>
    );

    return (
        <form
            className="flex flex-col gap-5"
            onSubmit={event => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                onSubmit({
                    contact: String(data.get('contact') || '') || undefined,
                    message: String(data.get('message') || ''),
                    rating: rating || undefined,
                });
            }}
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
                    <Input className={FIELD_BORDER} id={`${id}-contact`} maxLength={16} name="contact" variant="dark" />
                    <p className="m-0 text-xs text-outer-space-300">So we can reach out if we have any questions</p>
                </div>
                {/* lg, 40px: the height of the GitHub buttons beside it and of the app's dialog actions. */}
                <Button className={submitClassName} disabled={isSubmitting} size="lg" type="submit" variant="accent">
                    Submit
                </Button>
            </div>
        </form>
    );
}

// The dark input variant borders with outer-space-950, which nearly vanishes on the popup's ground;
// outer-space-800 is the border the popup's own cards use.
const FIELD_BORDER = '!border-outer-space-800';
