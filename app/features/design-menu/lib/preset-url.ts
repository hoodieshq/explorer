// REVIEW(design-menu): part of the review-only design menu; remove with it.

/** The preset parameters a query string sets, in the order of `names`; missing and empty ones are left out. */
export function presetEntries(search: string, names: readonly string[]): [string, string][] {
    const params = new URLSearchParams(search);
    return names.flatMap(name => {
        const value = params.get(name);
        return value ? [[name, value] satisfies [string, string]] : [];
    });
}

/**
 * The query string with every preset parameter in `names` replaced by `preset`; other parameters, such as the
 * cluster, stay. Returns `''` when nothing is left, otherwise a string starting with `?`.
 */
export function replacePreset(search: string, preset: readonly [string, string][], names: readonly string[]): string {
    const params = new URLSearchParams(search);
    names.forEach(name => params.delete(name));
    preset.forEach(([name, value]) => params.set(name, value));
    const query = params.toString();
    return query ? `?${query}` : '';
}
