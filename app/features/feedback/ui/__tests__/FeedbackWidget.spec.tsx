import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendFeedback } from '@/app/shared/lib/sentry/client';

import { FeedbackTrigger } from '../FeedbackTrigger';
import { FeedbackWidget } from '../FeedbackWidget';

vi.mock('@entities/cluster', () => ({
    clusterSlug: () => 'mainnet-beta',
    useCluster: () => ({ cluster: 0 }),
}));

const SENTRY_DSN_FIXTURE = 'https://examplePublicKey@o0.ingest.sentry.io/0';

describe('FeedbackWidget', () => {
    beforeEach(() => {
        vi.mocked(sendFeedback).mockClear();
        vi.mocked(sendFeedback).mockResolvedValue('test-event-id');
        vi.stubEnv('NEXT_PUBLIC_FEEDBACK_ENABLED', 'true');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should render nothing when the feature flag is off', () => {
        vi.stubEnv('NEXT_PUBLIC_FEEDBACK_ENABLED', 'false');
        render(<FeedbackWidget />);

        expect(screen.queryByRole('button', { name: 'Feedback' })).toBeNull();
    });

    it('should open the popup on the feedback form', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openPopup();

        expect(screen.getByRole('button', { name: 'Your thoughts' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('textbox', { name: 'Feedback' })).toBeInTheDocument();
    });

    it('should link each GitHub topic to its issue template', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openPopup();

        await userEvent.click(screen.getByRole('button', { name: 'Idea' }));
        expect(screen.getByRole('link', { name: 'Suggest an idea on GitHub' })).toHaveAttribute(
            'href',
            'https://github.com/solana-foundation/explorer/issues/new?template=feature_request.yml',
        );

        await userEvent.click(screen.getByRole('button', { name: 'Bug' }));
        expect(screen.getByRole('link', { name: 'Report a bug on GitHub' })).toHaveAttribute(
            'href',
            'https://github.com/solana-foundation/explorer/issues/new?template=bug_report.yml',
        );
    });

    it('should offer only the GitHub topics when client Sentry is disabled', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
        render(<FeedbackWidget />);
        await openPopup();

        expect(screen.queryByRole('button', { name: 'Your thoughts' })).toBeNull();
        expect(screen.queryByRole('textbox', { name: 'Feedback' })).toBeNull();
        expect(screen.getByRole('link', { name: 'Suggest an idea on GitHub' })).toBeInTheDocument();
    });

    it('should submit message, rating, contact, cluster, and source through sendFeedback and close the popup', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openPopup();

        await userEvent.click(screen.getByRole('radio', { name: '4 of 5 stars' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Feedback' }), 'Great explorer!');
        await userEvent.type(screen.getByRole('textbox', { name: 'X handle (optional)' }), '@fren');
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

        expect(sendFeedback).toHaveBeenCalledWith({
            message: 'Great explorer!',
            name: '@fren',
            source: 'widget',
            tags: { cluster: 'mainnet-beta', rating: 4, source: 'widget', type: 'feedback' },
        });
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('should not carry the previous rating into a popup reopened after a successful send', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openPopup();

        await userEvent.click(screen.getByRole('radio', { name: '5 of 5 stars' }));
        await userEvent.type(screen.getByRole('textbox', { name: 'Feedback' }), 'Rated once');
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        await openPopup();
        await userEvent.type(screen.getByRole('textbox', { name: 'Feedback' }), 'Second try');
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

        await waitFor(() => expect(sendFeedback).toHaveBeenCalledTimes(2));
        const resubmission = vi.mocked(sendFeedback).mock.calls[1][0];
        expect(resubmission.message).toBe('Second try');
        expect(resubmission.tags?.rating).toBeUndefined();
    });

    it('should keep the popup open when delivery fails (e.g. Sentry blocked)', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        vi.mocked(sendFeedback).mockRejectedValueOnce('Unable to send feedback.');
        render(<FeedbackWidget />);
        await openPopup();

        await userEvent.type(screen.getByRole('textbox', { name: 'Feedback' }), 'Lost feedback');
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

        await waitFor(() => expect(sendFeedback).toHaveBeenCalledOnce());
        expect(screen.getByRole('dialog', { name: 'Feedback' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Feedback' })).toHaveValue('Lost feedback');
    });

    it('should close the popup without sending when the close button is clicked', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(<FeedbackWidget />);
        await openPopup();

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(sendFeedback).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('should open the same popup from an inline trigger, such as the footer link', async () => {
        vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', SENTRY_DSN_FIXTURE);
        render(
            <>
                <FeedbackTrigger>Footer feedback</FeedbackTrigger>
                <FeedbackWidget />
            </>,
        );
        // The widget's panel loads lazily; wait for it before asking it to open.
        await screen.findByRole('button', { name: 'Feedback' });

        await userEvent.click(screen.getByRole('button', { name: 'Footer feedback' }));

        expect(await screen.findByRole('dialog', { name: 'Feedback' })).toBeInTheDocument();
    });
});

async function openPopup() {
    await userEvent.click(await screen.findByRole('button', { name: 'Feedback' }));
    await screen.findByRole('dialog', { name: 'Feedback' });
}
