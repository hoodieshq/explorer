export type FilterListOption = { count?: number; label: string; value: string };

/** The options whose label contains the query, ignoring case and surrounding spaces; all of them for no query. */
export function filterOptions(options: readonly FilterListOption[], query: string): FilterListOption[] {
    const needle = query.trim().toLowerCase();
    return needle === '' ? [...options] : options.filter(({ label }) => label.toLowerCase().includes(needle));
}
