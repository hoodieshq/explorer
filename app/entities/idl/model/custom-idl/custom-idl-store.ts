import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

import { type SupportedIdl } from '../../lib/types';
import { validateCustomIdl } from './parse-custom-idl';

/**
 * The source a user picked for a program. Absent means the default on-chain policy (PMP, then Anchor);
 * `anchor` exists only to pick the Anchor IDL over a PMP one.
 */
export type IdlSourceSelection = 'anchor' | 'custom';

export type CustomIdl = {
    idl: SupportedIdl;
    /** The uploaded file's name, or undefined for pasted JSON. */
    fileName?: string;
    addedAt: number;
};

export type ProgramIdlPreference = {
    custom?: CustomIdl;
    selected?: IdlSourceSelection;
};

/** Keyed by program address only: one custom IDL per program, shared by every cluster. */
export type ProgramIdlPreferences = Record<string, ProgramIdlPreference>;

export type CustomIdlWriteResult = { ok: true } | { ok: false; error: string };

const STORAGE_KEY = 'explorer:customIdls';

/**
 * What comes back from localStorage is `unknown` and editable by hand. A bad entry is dropped on read, and
 * an IDL for another program fails the same check an upload does, so storage cannot route a mismatched
 * IDL to a decoder. Nothing is written back: the next write persists the cleaned map.
 */
export function parseProgramIdlPreferences(value: unknown): ProgramIdlPreferences {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
    const preferences: ProgramIdlPreferences = {};
    for (const [address, entry] of Object.entries(value)) {
        const preference = parsePreference(address, entry);
        if (preference) preferences[address] = preference;
    }
    return preferences;
}

function parsePreference(address: string, value: unknown): ProgramIdlPreference | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const { custom, selected } = value as Partial<Record<keyof ProgramIdlPreference, unknown>>;
    const parsedCustom = parseCustomIdlEntry(address, custom);
    const parsedSelected =
        selected === 'anchor' || (selected === 'custom' && parsedCustom) ? (selected as IdlSourceSelection) : undefined;
    if (!parsedCustom && !parsedSelected) return undefined;
    return { custom: parsedCustom, selected: parsedSelected };
}

function parseCustomIdlEntry(address: string, value: unknown): CustomIdl | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const { idl, fileName, addedAt } = value as Partial<Record<keyof CustomIdl, unknown>>;
    const result = validateCustomIdl(idl, address);
    if (!result.ok || typeof addedAt !== 'number') return undefined;
    return { addedAt, fileName: typeof fileName === 'string' ? fileName : undefined, idl: result.idl };
}

// jotai's JSON storage parses but never checks, and its cross-tab `subscribe` path parses the raw storage
// event instead of going back through `getItem`, so both routes are wrapped.
const jsonStorage = createJSONStorage<ProgramIdlPreferences>();
const { subscribe } = jsonStorage;
const validatedStorage: typeof jsonStorage = {
    getItem: (key, initialValue) => parseProgramIdlPreferences(jsonStorage.getItem(key, initialValue)),
    removeItem: key => jsonStorage.removeItem(key),
    setItem: (key, newValue) => jsonStorage.setItem(key, newValue),
    // jotai checks the property before subscribing, so outside the browser it stays absent.
    subscribe:
        subscribe &&
        ((key, callback, initialValue) => subscribe(key, v => callback(parseProgramIdlPreferences(v)), initialValue)),
};

export const programIdlPreferencesAtom = atomWithStorage<ProgramIdlPreferences>(STORAGE_KEY, {}, validatedStorage);

/** Store a custom IDL for a program and select it. Replaces the program's previous custom IDL. */
export const addCustomIdlAtom = atom(
    undefined,
    (get, set, { programAddress, custom }: { programAddress: string; custom: CustomIdl }): CustomIdlWriteResult => {
        const previous = get(programIdlPreferencesAtom);
        try {
            set(programIdlPreferencesAtom, { ...previous, [programAddress]: { custom, selected: 'custom' } });
            return { ok: true };
        } catch (error) {
            // localStorage throws on a full quota after jotai has already updated the in-memory value;
            // restoring it keeps the UI from showing an IDL that will be gone on reload.
            set(programIdlPreferencesAtom, previous);
            return { error: storageErrorMessage(error), ok: false };
        }
    },
);

export const removeCustomIdlAtom = atom(undefined, (get, set, programAddress: string) => {
    const { [programAddress]: preference, ...rest } = get(programIdlPreferencesAtom);
    // A custom selection without its IDL is meaningless; an `anchor` pick survives the removal.
    const selected = preference?.selected === 'anchor' ? 'anchor' : undefined;
    set(programIdlPreferencesAtom, selected ? { ...rest, [programAddress]: { selected } } : rest);
});

export const selectIdlSourceAtom = atom(
    undefined,
    (get, set, { programAddress, selected }: { programAddress: string; selected: IdlSourceSelection | undefined }) => {
        const { [programAddress]: preference, ...rest } = get(programIdlPreferencesAtom);
        const next: ProgramIdlPreference = { custom: preference?.custom, selected };
        set(programIdlPreferencesAtom, next.custom || next.selected ? { ...rest, [programAddress]: next } : rest);
    },
);

function storageErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        return 'This IDL does not fit in the browser storage. Remove custom IDLs of other programs and try again.';
    }
    return 'The browser refused to store this IDL.';
}
