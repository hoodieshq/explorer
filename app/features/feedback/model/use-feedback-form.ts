import { clusterSlug, useCluster } from '@entities/cluster';
import { useState } from 'react';

import { useToast } from '@/app/components/shared/ui/sonner/use-toast';
import { withScope } from '@/app/shared/lib/sentry';
import { sendFeedback } from '@/app/shared/lib/sentry/client';

const FEEDBACK_SOURCE = 'widget';

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
            // sendFeedback sets its tags on the current scope. withScope keeps those tags off later events.
            await withScope(() =>
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
            toast.custom({ description: 'Thank you fren, enjoy exploring', title: 'Feedback sent!', type: 'success' });
            return true;
        } catch {
            // The form must stay open to keep the message the user typed.
            toast.custom({
                description: 'You can use the GitHub links in the form instead',
                title: 'Could not send feedback',
                type: 'error',
            });
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { isSubmitting, submit };
}
