import { useSyncExternalStore } from 'react';

/** `pills`: one layout on every width. `cards`: the form and the GitHub links as separate cards. */
export type FeedbackPopupLayout = 'pills' | 'cards';

const DESKTOP = '(min-width: 992px)';

/**
 * Opens the feedback popup from any entry point: the floating button, the burger menu, the footer. The popup
 * lives once in FeedbackWidget, so an entry point only asks for it; `origin` is the element the popup grows
 * out of and lands back on.
 */
export function openFeedbackPopup(origin: HTMLElement | null) {
    pendingOrigin = { origin };
    launchListeners.forEach(listener => listener());
}

/** The pending request, read once by the popup host; see takeFeedbackPopupRequest. */
export function useFeedbackPopupRequest(): { origin: HTMLElement | null } | undefined {
    return useSyncExternalStore(subscribeLaunch, () => pendingOrigin, noRequest);
}

/** Clears the request, so a host remounted by a route change does not open the popup again. */
export function takeFeedbackPopupRequest() {
    pendingOrigin = undefined;
    launchListeners.forEach(listener => listener());
}

/** The layout for the current width under the review's demo version: `mixed` shows cards from lg up. */
export function resolveFeedbackPopupLayout(version: FeedbackDemoVersion): FeedbackPopupLayout {
    const desktop = typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP).matches;
    return version === 'mixed' && desktop ? 'cards' : 'pills';
}

// REVIEW(HOO-1815): the demo version picker for the inner review; remove before the external PR, keeping
// the version the team picks.
export type FeedbackDemoVersion = 'pills' | 'mixed';
const DEMO_STORAGE_KEY = 'hoo-1815:demo-version';
let demoVersion: FeedbackDemoVersion | undefined;
const demoListeners = new Set<() => void>();

export function useFeedbackDemoVersion(): FeedbackDemoVersion {
    return useSyncExternalStore(subscribeDemo, readDemoVersion, () => 'pills');
}

export function getFeedbackDemoVersion(): FeedbackDemoVersion {
    return readDemoVersion();
}

export function setFeedbackDemoVersion(version: FeedbackDemoVersion) {
    demoVersion = version;
    try {
        localStorage.setItem(DEMO_STORAGE_KEY, version);
    } catch {
        // Storage can be blocked; the choice still holds for this page view.
    }
    demoListeners.forEach(listener => listener());
}

const launchListeners = new Set<() => void>();
let pendingOrigin: { origin: HTMLElement | null } | undefined;

function noRequest() {
    return undefined;
}

function subscribeLaunch(listener: () => void) {
    launchListeners.add(listener);
    return () => launchListeners.delete(listener);
}

function subscribeDemo(listener: () => void) {
    demoListeners.add(listener);
    return () => demoListeners.delete(listener);
}

function readDemoVersion(): FeedbackDemoVersion {
    if (demoVersion === undefined) {
        try {
            demoVersion = localStorage.getItem(DEMO_STORAGE_KEY) === 'mixed' ? 'mixed' : 'pills';
        } catch {
            demoVersion = 'pills';
        }
    }
    return demoVersion;
}
