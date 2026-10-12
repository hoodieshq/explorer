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

// REVIEW(HOO-1815): "Pretend to send" for the inner review. The preview's Sentry DSN is a dead stub, so a real send
// always fails; with this on, a send skips Sentry and succeeds, so reviewers see the sent path. On by default.
const FAKE_SEND_STORAGE_KEY = 'hoo-1815:fake-send';
let fakeSend: boolean | undefined;
const fakeSendListeners = new Set<() => void>();

export function useFeedbackFakeSend(): boolean {
    return useSyncExternalStore(subscribeFakeSend, readFakeSend, () => true);
}

export function getFeedbackFakeSend(): boolean {
    return readFakeSend();
}

export function setFeedbackFakeSend(value: boolean) {
    fakeSend = value;
    try {
        localStorage.setItem(FAKE_SEND_STORAGE_KEY, String(value));
    } catch {
        // Storage can be blocked; the choice still holds for this page view.
    }
    fakeSendListeners.forEach(listener => listener());
}

function subscribeFakeSend(listener: () => void) {
    fakeSendListeners.add(listener);
    return () => fakeSendListeners.delete(listener);
}

function readFakeSend(): boolean {
    if (fakeSend === undefined) {
        try {
            fakeSend = localStorage.getItem(FAKE_SEND_STORAGE_KEY) !== 'false';
        } catch {
            fakeSend = true;
        }
    }
    return fakeSend;
}

// REVIEW(HOO-1815): how the popup answers a send, for the inner review. `toast`: the popup drops towards a toast that
// says how it went. `card`: a failure is written beside Submit, and a sent popup flies off the top of the screen over
// a "Feedback sent!" note. `morph`: a failure is written beside Submit, and a sent popup rises and folds into a green
// toast at the top that bounces as it lands. `swap`: a failure is written beside Submit, and a sent popup swaps its
// content for a "Feedback sent!" note at once, then rises and fades. Remove before the external PR, keeping the one the
// team picks.
export type FeedbackResponseStyle = 'toast' | 'card' | 'morph' | 'swap';
const RESPONSE_STORAGE_KEY = 'hoo-1815:response-style';
let responseStyle: FeedbackResponseStyle | undefined;
const responseListeners = new Set<() => void>();

export function useFeedbackResponseStyle(): FeedbackResponseStyle {
    return useSyncExternalStore(subscribeResponse, readResponseStyle, () => 'swap');
}

export function getFeedbackResponseStyle(): FeedbackResponseStyle {
    return readResponseStyle();
}

export function setFeedbackResponseStyle(style: FeedbackResponseStyle) {
    responseStyle = style;
    try {
        localStorage.setItem(RESPONSE_STORAGE_KEY, style);
    } catch {
        // Storage can be blocked; the choice still holds for this page view.
    }
    responseListeners.forEach(listener => listener());
}

function subscribeResponse(listener: () => void) {
    responseListeners.add(listener);
    return () => responseListeners.delete(listener);
}

function readResponseStyle(): FeedbackResponseStyle {
    if (responseStyle === undefined) {
        try {
            const stored = localStorage.getItem(RESPONSE_STORAGE_KEY);
            responseStyle = stored === 'toast' || stored === 'card' || stored === 'morph' ? stored : 'swap';
        } catch {
            responseStyle = 'swap';
        }
    }
    return responseStyle;
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
