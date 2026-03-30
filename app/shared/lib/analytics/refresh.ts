import { type GA4EventName, trackEvent } from './track-event';

export enum RefreshEvent {
    ButtonClicked = 'rfsh_button_clicked',
}

export const refreshAnalytics = {
    trackButtonClicked(section: string): void {
        trackEvent(RefreshEvent.ButtonClicked, { section });
    },
};
