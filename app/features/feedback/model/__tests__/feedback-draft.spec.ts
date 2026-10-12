import { beforeEach, describe, expect, it } from 'vitest';

import { clearFeedbackDraft, readFeedbackDraft, saveFeedbackDraft } from '../feedback-draft';

describe('feedback draft', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should read back a saved draft', () => {
        saveFeedbackDraft({ contact: '@fren', message: 'Half written', rating: 3 });

        expect(readFeedbackDraft()).toEqual({ contact: '@fren', message: 'Half written', rating: 3 });
    });

    it('should drop the draft when the form is emptied', () => {
        saveFeedbackDraft({ message: 'Typed' });
        saveFeedbackDraft({ message: '' });

        expect(localStorage.getItem('explorer:feedbackDraft')).toBeNull();
    });

    it('should drop the draft once cleared', () => {
        saveFeedbackDraft({ message: 'Sent' });
        clearFeedbackDraft();

        expect(readFeedbackDraft()).toBeUndefined();
    });

    it('should ignore a stored value that is not JSON or not a draft', () => {
        localStorage.setItem('explorer:feedbackDraft', '{not json');
        expect(readFeedbackDraft()).toBeUndefined();

        localStorage.setItem('explorer:feedbackDraft', JSON.stringify({ message: 42 }));
        expect(readFeedbackDraft()).toBeUndefined();
    });
});
