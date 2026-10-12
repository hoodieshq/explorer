import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendFeedback } from '@/app/shared/lib/sentry/client';

import { setFeedbackFakeSend } from '../feedback-popup';
import { useFeedbackForm } from '../use-feedback-form';

vi.mock('@entities/cluster', () => ({
    clusterSlug: () => 'mainnet-beta',
    useCluster: () => ({ cluster: 0 }),
}));

describe('useFeedbackForm', () => {
    beforeEach(() => {
        localStorage.clear();
        setFeedbackFakeSend(false);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should give up on a send that has not answered in 5 seconds', async () => {
        vi.mocked(sendFeedback).mockReturnValueOnce(new Promise(() => undefined));
        const { result } = renderHook(() => useFeedbackForm());

        let sent: boolean | undefined;
        act(() => {
            void result.current.submit({ message: 'Hello' }).then(value => (sent = value));
        });
        expect(result.current.isSubmitting).toBe(true);

        await act(() => vi.advanceTimersByTimeAsync(5000));

        expect(sent).toBe(false);
        expect(result.current.isSubmitting).toBe(false);
    });
});
