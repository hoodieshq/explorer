import { isEnvEnabled } from '@utils/env';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

/**
 * Design-review only: renders the variant switcher and lets a stored variant take effect. With the flag
 * off, `Navbar` renders the shipping variant directly and never reads storage, so production behaviour
 * is identical to having no variants at all.
 */
export const NAV_VARIANTS_ENABLED = isEnvEnabled(process.env.NEXT_PUBLIC_NAV_VARIANTS_ENABLED);

const STORAGE_KEY = 'explorer:navVariant';

/**
 * Storage holds a variant id, not a variant: ids outlive the build that wrote them. Someone reviewing on
 * a preview deploy, then returning after `v3` was renamed or dropped, would otherwise land on a registry
 * lookup that yields `undefined` and renders no navbar at all — the whole header gone, with the cause
 * invisible. Unknown ids fall back to the shipping variant instead.
 *
 * The known ids and the fallback are passed in rather than imported: the registry imports this module, so
 * reaching back for them here would close the cycle. They used to be half-imported — a `DEFAULT_NAV_VARIANT`
 * spelled out here as a bare string — and the renumbering that turned `v1` into `v1.1` left it pointing at
 * an id no registry entry had, with nothing to catch it. It comes from the registry now, typed.
 */
export function parseNavVariant(value: unknown, knownIds: readonly string[], fallbackId: string): string {
    if (typeof value !== 'string') return fallbackId;
    return knownIds.includes(value) ? value : fallbackId;
}

export function createNavVariantAtom(knownIds: readonly string[], fallbackId: string) {
    const { getItem, setItem, removeItem, subscribe } = createJSONStorage<string>(() => localStorage);

    const validatedStorage = {
        getItem: (key: string, initialValue: string) =>
            parseNavVariant(getItem(key, initialValue), knownIds, fallbackId),
        removeItem,
        setItem,
        // Mirrors `savedClustersAtom`: only wrap `subscribe` when the underlying storage has one, so this
        // does not become a wrapper around nothing.
        subscribe:
            subscribe &&
            ((key: string, callback: (value: string) => void, initialValue: string) =>
                subscribe(key, v => callback(parseNavVariant(v, knownIds, fallbackId)), initialValue)),
    };

    return atomWithStorage<string>(STORAGE_KEY, fallbackId, validatedStorage);
}
