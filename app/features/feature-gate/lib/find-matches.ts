/** Where `query` occurs in `text`, case-insensitively: each match as `[start, end)`, in order and not overlapping. */
export function findMatches(text: string, query: string): [number, number][] {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const haystack = text.toLowerCase();
    const matches: [number, number][] = [];
    for (let start = haystack.indexOf(needle); start !== -1; start = haystack.indexOf(needle, start + needle.length)) {
        matches.push([start, start + needle.length]);
    }
    return matches;
}
