import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveFeedbackPopupLayout } from '../feedback-popup';

describe('resolveFeedbackPopupLayout', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should show the pills layout on every width in the pills version', () => {
        stubDesktop(true);

        expect(resolveFeedbackPopupLayout('pills')).toBe('pills');
    });

    it('should show the cards layout from lg in the mixed version', () => {
        stubDesktop(true);

        expect(resolveFeedbackPopupLayout('mixed')).toBe('cards');
    });

    it('should keep the pills layout below lg in the mixed version', () => {
        stubDesktop(false);

        expect(resolveFeedbackPopupLayout('mixed')).toBe('pills');
    });
});

function stubDesktop(matches: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }));
}
