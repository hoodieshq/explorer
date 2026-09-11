/**
 * Put the page back at the top, for the moments when a reader has chosen a different endpoint.
 *
 * Done here rather than left to the App Router's `scroll` option: that option only takes effect when the
 * navigation renders a new segment, and every navigation this switcher makes writes to the query string
 * of the page already on screen — so the option is a no-op exactly where it was being relied on. The
 * choice itself is what asks for this, not the navigation: the data on the page is about to be replaced
 * wholesale, and it is read from the top.
 *
 * Not called for the commits that fire while the reader is typing — those must move nothing.
 */
export function scrollPageToTop() {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0 });
}
