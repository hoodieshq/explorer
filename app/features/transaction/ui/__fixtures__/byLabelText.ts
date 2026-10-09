/**
 * Matches the innermost element whose full text equals the label.
 * `InfoTooltip` splits a label across nested spans, so no single text node holds it.
 */
export function byLabelText(label: string) {
    return (_content: string, element: Element | null): boolean => {
        if (element?.textContent !== label) return false;
        return Array.from(element.children).every(child => child.textContent !== label);
    };
}
