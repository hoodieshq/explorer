'use client';

import { approveRpcOriginAtom, parseRpcEndpoint, useCluster } from '@entities/cluster';
import { useDebounceCallback } from '@react-hook/debounce';
import { Cluster } from '@utils/cluster';
import { useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { useClusterHref } from './use-cluster-href';

// How long typing pauses before the endpoint reaches the URL. Long enough that a typed-out URL commits
// once rather than once per word.
const COMMIT_DELAY_MS = 500;

export type CustomUrlDraft = {
    /** Call on every keystroke. */
    onChange: (next: string) => void;
    /**
     * Put an endpoint in the field and commit it at once, for a value the user picked rather than typed —
     * a bookmark in the list. A click is a decision, not a pause in typing, so it does not wait out the
     * debounce.
     */
    select: (next: string) => void;
    /** What the field shows. */
    value: string;
};

/**
 * The state behind the custom endpoint field, which edits a value it does not own: the endpoint lives in
 * the `customUrl` query param, which is what makes a custom cluster shareable. So the field and the URL
 * bar track each other in both directions:
 *
 * - Field → URL. Typing navigates, debounced; a picked endpoint (`select`) navigates at once. Either way
 *   it is a first-party action, so it is also the consent — the origin is approved before the navigation
 *   lands, or the reader would meet the user's own endpoint as an unvetted inbound one and prompt for
 *   what they just typed.
 * - URL → field. A saved cluster, an in-app link or a declined prompt changes the endpoint without anyone
 *   touching the field, which has to follow or it shows an endpoint the app is not on.
 *
 * `sentUrl` cuts the resulting loop: it holds what this field last committed, so the arrival that matches
 * it is the field's own echo and is not written back, and keystrokes typed during that navigation survive.
 * It is dropped on the next sync, because left standing it would keep matching — saving a cluster starts
 * by typing its URL, so selecting that entry later would leave the field showing the endpoint before it.
 *
 * All three are compared as strings, since `RpcEndpoint.href` is the URL as given: a re-parsed endpoint
 * with a new object identity cannot trip the guard.
 */
export function useCustomUrlDraft(): CustomUrlDraft {
    // Always set on the Custom cluster, where the reader falls back to the default endpoint. Empty on
    // every other cluster, which is what the field shows while it is hidden.
    const { endpoint } = useCluster();
    const resolvedUrl = endpoint?.href ?? '';

    const buildHref = useClusterHref();
    const approveOrigin = useSetAtom(approveRpcOriginAtom);
    const router = useRouter();

    // `syncedUrl` is the resolved endpoint this hook already took in, so a change to it triggers a
    // re-sync. Adjusting state during render is React's documented way to follow a changing source; state
    // rather than a ref, because the re-sync reads these on the extra render it queues itself.
    const [syncedUrl, setSyncedUrl] = useState(resolvedUrl);
    const [draftUrl, setDraftUrl] = useState(resolvedUrl);
    const [sentUrl, setSentUrl] = useState<string | undefined>(undefined);
    if (resolvedUrl !== syncedUrl) {
        setSyncedUrl(resolvedUrl);
        setSentUrl(undefined);
        if (resolvedUrl !== sentUrl) setDraftUrl(resolvedUrl);
    }

    // What the field is meant to hold right now, which is not always what a pending commit was given: the
    // debounce cannot be cancelled (`useDebounceCallback` exposes no handle), so a value that has since
    // been superseded — by another keystroke, or by a bookmark being picked mid-pause — is dropped when it
    // finally fires rather than navigating over the newer choice. A ref, because the check happens inside
    // a callback that must not be re-created per keystroke.
    const intended = useRef(resolvedUrl);

    // `replace` rather than `push`: editing one field should not leave a history entry per typing pause,
    // each holding a half-typed URL.
    const commitNow = (url: string) => {
        // An empty field clears the endpoint instead of leaving the previous one in the URL.
        if (url.trim() === '') {
            setSentUrl(undefined);
            router.replace(buildHref({ cluster: Cluster.Custom, customUrl: '' }));
            return;
        }
        // Half-typed values are not endpoints yet: navigating on them churns the URL, and the reader
        // strips each one on arrival.
        const typedEndpoint = parseRpcEndpoint(url);
        if (typedEndpoint === undefined) return;
        // Typing or picking an endpoint is a first-party action, so it is also the consent.
        approveOrigin(typedEndpoint);
        setSentUrl(url);
        router.replace(buildHref({ cluster: Cluster.Custom, customUrl: url }));
    };

    const commit = useDebounceCallback((url: string) => {
        if (url !== intended.current) return;
        commitNow(url);
    }, COMMIT_DELAY_MS);

    return {
        onChange: (next: string) => {
            intended.current = next;
            setDraftUrl(next);
            commit(next);
        },
        select: (next: string) => {
            intended.current = next;
            setDraftUrl(next);
            commitNow(next);
        },
        value: draftUrl,
    };
}
