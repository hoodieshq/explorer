import { clusterSlug, useCluster } from '@entities/cluster';
import { useState } from 'react';

import { useToast } from '@/app/components/shared/ui/sonner/use-toast';
import { withScope } from '@/app/shared/lib/sentry';
import { sendFeedback } from '@/app/shared/lib/sentry/client';

import { clearFeedbackDraft } from './feedback-draft';
import { getFeedbackFakeSend, getFeedbackResponseStyle } from './feedback-popup';

const FEEDBACK_SOURCE = 'widget';
// REVIEW(HOO-1815): how long a pretended send takes, about a real round trip.
const FAKE_SEND_MS = 600;
// Sonner slides a bottom toast up from below its place. This one drops in from above, the way the popup leaves, so the
// two read as one motion. A keyframe animation rather than a new start for sonner's transition: the transition runs
// only if a frame is painted before sonner flags the toast mounted, which React does not promise.
const DROP_IN_TOAST = 'animate-in fade-in slide-in-from-top-full ease-out [animation-duration:400ms]';

/** Why a send failed and what to do instead: in the error toast, or beside Submit. */
export const FEEDBACK_SEND_ERROR = {
    description: 'Try again.',
    title: 'Could not send feedback',
};
/**
 * How long a send error stays up, beside Submit or as a toast; beside Submit it then fades out over
 * FEEDBACK_ERROR_FADE_MS.
 */
export const FEEDBACK_ERROR_SHOWN_MS = 4000;
export const FEEDBACK_ERROR_FADE_MS = 1000;
// A send that has not answered by then counts as failed, so Submit is never held disabled for longer.
const SEND_TIMEOUT_MS = 5000;
export const FEEDBACK_SENT = { description: 'Thank you fren, enjoy exploring', title: 'Feedback sent!' };

export interface FeedbackFormValues {
    contact?: string;
    message: string;
    /** A value from 1 to 5, or `undefined` when the user selects no star. */
    rating?: number;
}

export function useFeedbackForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { cluster } = useCluster();
    const toast = useToast();

    // Resolves to whether the feedback was sent, so the popup holding the form can close itself.
    const submit = async (values: FeedbackFormValues): Promise<boolean> => {
        setIsSubmitting(true);
        try {
            // REVIEW(HOO-1815): with "Pretend to send" on, skip Sentry and take the sent path after a short wait.
            if (getFeedbackFakeSend()) {
                await new Promise(resolve => setTimeout(resolve, FAKE_SEND_MS));
                markSent();
                return true;
            }
            // sendFeedback sets its tags on the current scope. withScope keeps those tags off later events.
            const sent = withScope(() =>
                sendFeedback({
                    message: values.message,
                    name: values.contact,
                    // sendFeedback sets `source` to 'api' when it is unset.
                    source: FEEDBACK_SOURCE,
                    tags: {
                        cluster: clusterSlug(cluster),
                        rating: values.rating,
                        source: FEEDBACK_SOURCE,
                        type: 'feedback',
                    },
                }),
            );
            // A send that answers after the timeout may still arrive; a retry can then send the same feedback twice,
            // which beats a form stuck disabled.
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                await Promise.race([
                    sent,
                    new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new Error('Feedback send timed out')), SEND_TIMEOUT_MS);
                    }),
                ]);
            } finally {
                clearTimeout(timer);
            }
            markSent();
            return true;
        } catch {
            // The form must stay open to keep the message the user typed. REVIEW(HOO-1815): on the card, the popup
            // writes the error beside Submit instead.
            if (getFeedbackResponseStyle() === 'toast') {
                toast.custom({ ...FEEDBACK_SEND_ERROR, type: 'error' }, { duration: FEEDBACK_ERROR_SHOWN_MS });
            }
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // Raised as the popup starts to leave, so the popup seems to turn into it. REVIEW(HOO-1815): on the card, the
    // popup shows its own "Feedback sent!" note instead.
    const markSent = () => {
        clearFeedbackDraft();
        if (getFeedbackResponseStyle() !== 'toast') return;
        toast.custom({ ...FEEDBACK_SENT, type: 'success' }, { className: DROP_IN_TOAST });
    };

    return { isSubmitting, submit };
}
