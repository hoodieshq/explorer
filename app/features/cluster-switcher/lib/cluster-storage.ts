import { parseRpcEndpoint } from '@entities/cluster';
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

import { normalizeClusterName } from './cluster-name';

export interface SavedCluster {
    name: string;
    url: string;
}

const STORAGE_KEY = 'explorer:savedClusters';

/**
 * What comes back from localStorage is `unknown`: the key is editable by hand and outlives any format
 * this app ships. Two failures this prevents — a root that is not an array throws on `.map` and takes the
 * modal down, and an entry whose URL is not an RPC endpoint renders a button that goes nowhere, since the
 * reader refuses the value on arrival and strips it back out of the query string.
 *
 * Nothing is written back: the next add or remove persists this list, so a bad entry clears itself
 * without opening the switcher having a side effect on the user's storage.
 */
export function parseSavedClusters(value: unknown): SavedCluster[] {
    if (!Array.isArray(value)) return [];
    // Keyed by URL, because the URL is what an entry *is*: the endpoint. The name is a label the user
    // writes on it, may be blank, and may repeat — so it cannot be the identity. Two entries for one
    // endpoint are the same entry saved twice; the last one wins, matching `addSavedClusterAtom`.
    const byUrl = new Map<string, SavedCluster>();
    for (const entry of value) {
        const cluster = parseSavedCluster(entry);
        if (cluster) byUrl.set(cluster.url, cluster);
    }
    return [...byUrl.values()];
}

function parseSavedCluster(value: unknown): SavedCluster | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const { name, url } = value as Partial<Record<keyof SavedCluster, unknown>>;
    if (typeof name !== 'string' || typeof url !== 'string') return undefined;
    // Normalized to match what a save stores: trimmed, and capped rather than dropped, since the URL is
    // the part that carries the value. An empty name is kept — saving is one click, naming is optional and
    // can be done later, so an unnamed entry is a state the UI produces on purpose and shows by its host.
    const clusterName = normalizeClusterName(name);
    // The same check the save form and the reader apply. Storage is the one input that reaches the
    // switcher without passing either.
    if (!parseRpcEndpoint(url)) return undefined;
    return { name: clusterName, url };
}

// jotai's JSON storage parses but never checks, and its cross-tab `subscribe` path parses the raw storage
// event instead of going back through `getItem`. Both are wrapped, so no route into the atom skips the
// check. Not `unstable_withStorageValidator`: it is all-or-nothing — one bad entry discards the whole
// list — and it leaves `subscribe` unwrapped.
const jsonStorage = createJSONStorage<SavedCluster[]>();
const { subscribe } = jsonStorage;
const validatedStorage: typeof jsonStorage = {
    getItem: (key, initialValue) => parseSavedClusters(jsonStorage.getItem(key, initialValue)),
    removeItem: key => jsonStorage.removeItem(key),
    setItem: (key, newValue) => jsonStorage.setItem(key, newValue),
    // jotai checks the property before subscribing, so outside the browser it has to stay absent rather
    // than become a wrapper around nothing.
    subscribe:
        subscribe &&
        ((key, callback, initialValue) => subscribe(key, v => callback(parseSavedClusters(v)), initialValue)),
};

export const savedClustersAtom = atomWithStorage<SavedCluster[]>(STORAGE_KEY, [], validatedStorage);

// Write-only atoms: jotai treats any non-function first argument as the initial read value, so
// `undefined` means these hold no readable state and exist only for their write function.
export const addSavedClusterAtom = atom(undefined, (get, set, cluster: SavedCluster) => {
    set(savedClustersAtom, [...excludeByUrl(get(savedClustersAtom), cluster.url), cluster]);
});

export const removeSavedClusterAtom = atom(undefined, (get, set, url: string) => {
    set(savedClustersAtom, excludeByUrl(get(savedClustersAtom), url));
});

/**
 * An edit of a kept entry: its name, its address, or both. Addressed by the URL it currently holds, which
 * is its identity — renaming by the old *name* could not name an unnamed entry, nor tell two entries apart
 * that happen to share a label.
 *
 * A blank name is legal, not a rejected value: saving is one click and naming is a second thought, so an
 * entry may sit unnamed and be known by its host. Duplicate labels are legal for the same reason.
 *
 * The address is not free: it has to be an endpoint the reader would accept (the check the save form and
 * the URL reader both apply), and it cannot collide with another entry, because two entries on one URL are
 * one entry saved twice. Both refusals throw, so the form can say which one happened.
 *
 * Editing does *not* re-point the app. If the entry being edited is the endpoint in use, the page stays on
 * the endpoint it is on — the reader was correcting a bookmark, not asking to travel.
 */
export const updateSavedClusterAtom = atom(
    undefined,
    (get, set, edit: { name: string; nextUrl?: string; url: string }) => {
        const clusters = get(savedClustersAtom);
        if (!clusters.some(c => c.url === edit.url)) return;
        // The same normalization storage holds names in, so an edit cannot store one a save could never
        // produce.
        const name = normalizeClusterName(edit.name);
        const nextUrl = edit.nextUrl ?? edit.url;
        if (nextUrl !== edit.url) {
            if (!parseRpcEndpoint(nextUrl)) throw new Error('That is not a full RPC URL.');
            if (clusters.some(c => c.url === nextUrl)) throw new Error('Another saved endpoint has that address.');
        }
        set(
            savedClustersAtom,
            clusters.map(c => (c.url === edit.url ? { name, url: nextUrl } : c)),
        );
    },
);

/**
 * Puts a removed entry back, at the position it held. For an undo offered while a menu is open: a delete
 * is one click and the list is the only record of an endpoint anyone typed, so the few seconds before the
 * menu closes are worth being able to take it back in.
 *
 * Refuses to duplicate: if that URL has come back by some other route while the offer stood — saved again
 * by hand, say — the list already has it and this does nothing. The index is clamped, because the list can
 * have grown or shrunk since.
 */
export const restoreSavedClusterAtom = atom(undefined, (get, set, entry: { at: number } & SavedCluster) => {
    const clusters = get(savedClustersAtom);
    if (clusters.some(c => c.url === entry.url)) return;
    const at = Math.min(Math.max(entry.at, 0), clusters.length);
    set(savedClustersAtom, [...clusters.slice(0, at), { name: entry.name, url: entry.url }, ...clusters.slice(at)]);
});

function excludeByUrl(clusters: SavedCluster[], url: string): SavedCluster[] {
    return clusters.filter(c => c.url !== url);
}
