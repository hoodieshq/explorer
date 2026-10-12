import { is, number, object, optional, string } from 'superstruct';

import type { FeedbackFormValues } from './use-feedback-form';

const STORAGE_KEY = 'explorer:feedbackDraft';

const FeedbackDraftStruct = object({
    contact: optional(string()),
    message: string(),
    rating: optional(number()),
});

/** What the user typed into the feedback form and has not sent yet, kept across reloads. */
export function readFeedbackDraft(): FeedbackFormValues | undefined {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return undefined;
        const value: unknown = JSON.parse(raw);
        // The key is editable by hand and outlives this format, so anything else is dropped, not trusted.
        return is(value, FeedbackDraftStruct) ? value : undefined;
    } catch {
        // Blocked storage or a value that is not JSON: start from an empty form.
        return undefined;
    }
}

export function saveFeedbackDraft(draft: FeedbackFormValues) {
    try {
        if (!draft.message && !draft.contact && !draft.rating) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
        // Blocked storage or the quota: the draft then lives only as long as the page.
    }
}

/** Called once the feedback is sent: the draft has done its job. */
export function clearFeedbackDraft() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Blocked storage holds no draft to clear.
    }
}
