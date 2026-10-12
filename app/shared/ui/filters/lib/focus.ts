// A control is focusable here unless it is disabled, taken out of the tab order, or a filter reset (which disappears
// once used, so it can't take the focus it hands back).
const FOCUSABLE = [
    'input:not([disabled])',
    'button:not([disabled]):not([data-filter-reset])',
    '[tabindex]:not([tabindex="-1"]):not([data-filter-reset])',
].join(', ');

/**
 * Moves focus to the first control in `container`, on the next frame so a reset has re-rendered. A reset removes the
 * button that had focus; without this, focus would fall back to the page's top (WCAG 2.4.3 Focus Order).
 */
export function focusFirstControl(container: Element | null) {
    requestAnimationFrame(() => {
        if (!container?.isConnected) return;
        container.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });
}
