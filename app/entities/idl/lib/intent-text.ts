import { isAddress } from '@solana/kit';

/** A run of an intent sentence: plain prose or an address the renderer can shorten and link. */
export type IntentSentencePart = { kind: 'text'; text: string } | { kind: 'address'; address: string };

/** A run of an intent template: plain prose or a `${accounts.x}` / `${data.x}` placeholder. */
export type IntentTemplatePart =
    { kind: 'text'; text: string } | { kind: 'placeholder'; source: 'accounts' | 'data'; name: string };

// Candidate runs only: a base58 run can also be a long number without zeros, so each match is confirmed
// with `isAddress` before it is treated as one.
// eslint-disable-next-line no-restricted-syntax -- scanning free text for base58 runs has no non-regex equivalent
const BASE58_RUN = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
// eslint-disable-next-line no-restricted-syntax -- the sRFC 39 placeholder grammar is `${source.name}`
const PLACEHOLDER = /\$\{(accounts|data)\.([A-Za-z0-9_]+)\}/g;

/**
 * Split an SDK-resolved intent sentence into prose and addresses.
 * The display layer returns addresses as raw base58 inside the sentence, so presentation is recovered here.
 */
export function splitIntentSentence(sentence: string): IntentSentencePart[] {
    const parts: IntentSentencePart[] = [];
    let cursor = 0;

    for (const match of sentence.matchAll(BASE58_RUN)) {
        const [candidate] = match;
        const start = match.index ?? 0;
        if (!isAddress(candidate) || !isWordBoundary(sentence, start, start + candidate.length)) continue;

        if (start > cursor) parts.push({ kind: 'text', text: sentence.slice(cursor, start) });
        parts.push({ address: candidate, kind: 'address' });
        cursor = start + candidate.length;
    }

    if (cursor < sentence.length) parts.push({ kind: 'text', text: sentence.slice(cursor) });
    return parts;
}

/** Split an sRFC 39 `interpolatedIntent` template into prose and the placeholders it references. */
export function parseIntentTemplate(template: string): IntentTemplatePart[] {
    const parts: IntentTemplatePart[] = [];
    let cursor = 0;

    for (const match of template.matchAll(PLACEHOLDER)) {
        const start = match.index ?? 0;
        if (start > cursor) parts.push({ kind: 'text', text: template.slice(cursor, start) });
        parts.push({ kind: 'placeholder', name: match[2], source: match[1] as 'accounts' | 'data' });
        cursor = start + match[0].length;
    }

    if (cursor < template.length) parts.push({ kind: 'text', text: template.slice(cursor) });
    return parts;
}

/** `Gjzy5…X1GBv`: enough of both ends to tell addresses apart in a sentence, short enough to keep it one line. */
export function shortenAddress(address: string, keep = 5): string {
    if (address.length <= keep * 2 + 1) return address;
    return `${address.slice(0, keep)}…${address.slice(-keep)}`;
}

function isWordBoundary(text: string, start: number, end: number): boolean {
    return !isAlphanumeric(text[start - 1]) && !isAlphanumeric(text[end]);
}

function isAlphanumeric(char: string | undefined): boolean {
    if (char === undefined) return false;
    const lower = char.toLowerCase();
    return (lower >= 'a' && lower <= 'z') || (char >= '0' && char <= '9');
}
