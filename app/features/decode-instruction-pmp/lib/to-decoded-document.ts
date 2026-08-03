import { Format } from '@solana-program/program-metadata';

import type { PmpDecodedDocument } from './types';

/**
 * Decides how an already-decoded payload string should be presented. Only `Json` gets parsed, and only after the
 * caller has enforced the render cap, so `JSON.parse` never sees an unbounded document. Yaml/Toml/None stay
 * verbatim text - no parser library is pulled in, so no new attack surface.
 */
export function toDecodedDocument(text: string, format: Format): PmpDecodedDocument {
    if (format !== Format.Json) {
        return { kind: 'text', text };
    }
    try {
        const value: unknown = JSON.parse(text);
        // `SolarizedJsonViewer` wraps react-json-view, whose `src` must be an object or array. A scalar document
        // is valid JSON but has no tree to show, so it degrades to text rather than crashing the viewer.
        if (typeof value !== 'object' || value === null) {
            return { kind: 'text', text };
        }
        return { kind: 'json', value };
    } catch {
        // The on-chain `format` hint is attacker-controlled, so a Json hint over non-JSON bytes is expected.
        return { kind: 'text', text };
    }
}
