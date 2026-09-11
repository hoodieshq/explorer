'use client';

import { useAtomValue } from 'jotai';

import { ICON_SETS, iconSetAtom } from './icon-sets';

/**
 * The provenance green. Spelled here rather than imported from `ClusterDropdownBody`'s `RPC_STYLE`:
 * that module imports the rows this mark is drawn in, and reaching back for the colour would close the
 * cycle. Same value, one place away.
 */
export const KNOWN_COLOUR = '#1dd79b';

/** The provenance amber, the tone the shipping cluster button turns for an endpoint nobody vouched for. */
export const UNKNOWN_COLOUR = '#e08214';

/**
 * "The app knows this one" — the stamp the switcher already uses for a vouched-for endpoint, drawn from
 * whichever icon set the review has chosen so it cannot drift from the caption's glyph.
 *
 * Used in two lists at once, deliberately: beside the clusters the app ships with, and beside the saved
 * endpoints it also knows (`isKnownEndpoint`). One fact should not have two marks, and a reader who learns
 * it in the top list should not have to learn it again in the bottom one.
 *
 * Visual only, with a tooltip: an `sr-only` word inside the row would join the link's accessible name,
 * so "Mainnet Beta" would read as "Mainnet Beta known endpoint" — and the fact is already stated in words
 * by the trigger's own caption. The mark is a shorthand for it in the list, not a second announcement.
 */
export function KnownMark({ size = 13, title }: { size?: number; title?: string }) {
    const Glyph = ICON_SETS[useAtomValue(iconSetAtom)].provenance.known;
    return (
        <span
            aria-hidden
            className="flex shrink-0 items-center"
            style={{ color: KNOWN_COLOUR }}
            title={title ?? 'A known endpoint — one this deployment ships with or vouches for'}
        >
            <Glyph size={size} />
        </span>
    );
}

/**
 * "Nobody has vouched for this one" — the same stamp struck through, in the amber this palette reserves
 * for an endpoint the app did not ship with and nobody on the deployment's list owns.
 *
 * Drawn on remote endpoints only. A validator on the reader's own machine gets no mark at all: there is no
 * third party in that connection to trust or distrust, so a warning about it would be a verdict on their
 * own desk (`endpointProvenance`).
 */
export function UnknownMark({ size = 13, title }: { size?: number; title?: string }) {
    const Glyph = ICON_SETS[useAtomValue(iconSetAtom)].provenance.unknown;
    return (
        <span
            aria-hidden
            className="flex shrink-0 items-center"
            style={{ color: UNKNOWN_COLOUR }}
            title={title ?? 'Nobody has vouched for this endpoint'}
        >
            <Glyph size={size} />
        </span>
    );
}
