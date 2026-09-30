import { parseIntentTemplate, shortenAddress } from '@entities/idl';
import { isAddress } from '@solana/kit';

/** A run of the readback sentence: prose, a value the form already holds, or a slot still to fill. */
export type ReadbackPart =
    | { kind: 'text'; text: string }
    | { kind: 'filled'; name: string; text: string; isAddress: boolean }
    | { kind: 'missing'; name: string };

/** The form values as `useWatch` hands them over: any level may still be missing. */
export type ReadbackValues = {
    accounts?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
};

export type Readback = {
    parts: ReadbackPart[];
    /** Placeholder names still empty, in sentence order and without repeats. */
    missing: string[];
};

/**
 * Lay an instruction's intent template over the form's current values: filled placeholders show what was
 * typed, empty ones stay as named slots. Pure and offline, so it can follow every keystroke.
 */
export function buildReadback({
    template,
    instructionName,
    values,
}: {
    template: string;
    instructionName: string;
    values: ReadbackValues;
}): Readback {
    const accounts = asRecord(values.accounts?.[instructionName]);
    const args = asRecord(values.arguments?.[instructionName]);
    const missing: string[] = [];

    const parts = parseIntentTemplate(template).map((part): ReadbackPart => {
        if (part.kind === 'text') return part;

        const value = lookup(part.source === 'accounts' ? accounts : args, part.name)?.trim();
        if (!value) {
            if (!missing.includes(part.name)) missing.push(part.name);
            return { kind: 'missing', name: part.name };
        }

        const address = isAddress(value);
        return { isAddress: address, kind: 'filled', name: part.name, text: address ? shortenAddress(value) : value };
    });

    return { missing, parts };
}

// Template names are the IDL's camelCase; the form keys come from the formatted IDL and can differ in case
// or separators, so an exact miss falls back to a normalized match. Nested account groups are not
// placeholders, so non-string values are skipped.
function lookup(record: Record<string, unknown>, name: string): string | undefined {
    const exact = record[name];
    if (typeof exact === 'string') return exact;

    const normalized = normalize(name);
    const match = Object.entries(record).find(
        ([key, value]) => typeof value === 'string' && normalize(key) === normalized,
    );
    return match?.[1] as string | undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function normalize(name: string): string {
    return [...name]
        .filter(char => char !== '_' && char !== '-' && char !== ' ')
        .join('')
        .toLowerCase();
}
