/** The option a keyboard move lands on: `delta` steps from `current`, held at the list's ends rather than wrapping. */
export function moveActive(values: readonly string[], current: string | undefined, delta: number): string | undefined {
    if (values.length === 0) return undefined;
    const index = current === undefined ? -1 : values.indexOf(current);
    if (index === -1) return values[delta < 0 ? values.length - 1 : 0];
    return values[Math.min(values.length - 1, Math.max(0, index + delta))];
}
