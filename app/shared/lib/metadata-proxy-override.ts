import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-929): lets the design menu send off-chain metadata and art past the metadata proxy or through it,
// whatever the deploy's `NEXT_PUBLIC_METADATA_ENABLED` says, so a reviewer can see both the loaded art and the
// placeholder on one preview. The bypass is on until a reviewer turns it off, so a preview shows the art. Remove with
// the design menu.

export const METADATA_PROXY_STORAGE_KEY = 'hoo-929:metadata-proxy';

/** `true` sends metadata through the proxy, `false` (the default) straight to its host. */
export const metadataProxyOverrideAtom = atomWithStorage<boolean>(METADATA_PROXY_STORAGE_KEY, false);

/**
 * The reviewer's choice, read from storage directly: `getProxiedUri` is a plain function, not a hook. On the server,
 * which has no storage, the deploy decides (`undefined`).
 */
export function readMetadataProxyOverride(): boolean | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        const stored: unknown = JSON.parse(window.localStorage.getItem(METADATA_PROXY_STORAGE_KEY) ?? 'null');
        return typeof stored === 'boolean' ? stored : false;
    } catch {
        return false;
    }
}
