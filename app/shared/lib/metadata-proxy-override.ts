import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-921): lets the design menu send off-chain metadata and art past the metadata proxy or through it,
// whatever the deploy's `NEXT_PUBLIC_METADATA_ENABLED` says, so a reviewer can see both the loaded art and the
// placeholder on one preview. Remove with the design menu.

const STORAGE_KEY = 'hoo-921:metadata-proxy';

/** `true` sends metadata through the proxy, `false` straight to its host; unset leaves it to the deploy. */
export const metadataProxyOverrideAtom = atomWithStorage<boolean | undefined>(STORAGE_KEY, undefined);

/** The reviewer's choice, read from storage directly: `getProxiedUri` is a plain function, not a hook. */
export function readMetadataProxyOverride(): boolean | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
        return typeof stored === 'boolean' ? stored : undefined;
    } catch {
        return undefined;
    }
}
