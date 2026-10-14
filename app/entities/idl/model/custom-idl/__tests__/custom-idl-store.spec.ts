import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type SupportedIdl } from '../../../lib/types';
import {
    addCustomIdlAtom,
    parseProgramIdlPreferences,
    programIdlPreferencesAtom,
    removeCustomIdlAtom,
    selectIdlSourceAtom,
} from '../custom-idl-store';

const PROGRAM = 'AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye';
const OTHER = 'ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S';
const STORAGE_KEY = 'explorer:customIdls';

const idlFor = (address: string) =>
    ({ address, instructions: [], metadata: { spec: '0.1.0' } }) as unknown as SupportedIdl;
const customFor = (address: string) => ({ addedAt: 1, fileName: 'voting.json', idl: idlFor(address) });

describe('parseProgramIdlPreferences', () => {
    it('should keep valid entries', () => {
        const value = { [PROGRAM]: { custom: customFor(PROGRAM), selected: 'custom' } };
        expect(parseProgramIdlPreferences(value)).toEqual(value);
    });

    it('should drop an entry whose IDL declares another program', () => {
        expect(parseProgramIdlPreferences({ [PROGRAM]: { custom: customFor(OTHER), selected: 'custom' } })).toEqual({});
    });

    it('should drop a custom selection without its IDL but keep an anchor selection', () => {
        expect(
            parseProgramIdlPreferences({ [OTHER]: { selected: 'anchor' }, [PROGRAM]: { selected: 'custom' } }),
        ).toEqual({ [OTHER]: { custom: undefined, selected: 'anchor' } });
    });

    it('should return an empty map for a root that is not an object', () => {
        expect(parseProgramIdlPreferences([1, 2])).toEqual({});
        expect(parseProgramIdlPreferences('x')).toEqual({});
    });
});

describe('custom IDL atoms', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('should store a custom IDL, select it, and persist it', () => {
        const store = createStore();
        const result = store.set(addCustomIdlAtom, { custom: customFor(PROGRAM), programAddress: PROGRAM });

        expect(result).toEqual({ ok: true });
        expect(store.get(programIdlPreferencesAtom)[PROGRAM]).toEqual({
            custom: customFor(PROGRAM),
            selected: 'custom',
        });
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')[PROGRAM].selected).toBe('custom');
    });

    it('should replace the previous custom IDL of the program', () => {
        const store = createStore();
        store.set(addCustomIdlAtom, { custom: customFor(PROGRAM), programAddress: PROGRAM });
        const replacement = { ...customFor(PROGRAM), fileName: 'v2.json' };
        store.set(addCustomIdlAtom, { custom: replacement, programAddress: PROGRAM });

        expect(store.get(programIdlPreferencesAtom)[PROGRAM]?.custom).toEqual(replacement);
    });

    it('should restore the previous state when storage is full', () => {
        const store = createStore();
        vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });

        const result = store.set(addCustomIdlAtom, { custom: customFor(PROGRAM), programAddress: PROGRAM });

        expect(result.ok).toBe(false);
        expect(store.get(programIdlPreferencesAtom)).toEqual({});
    });

    it('should drop the custom selection when the custom IDL is removed', () => {
        const store = createStore();
        store.set(addCustomIdlAtom, { custom: customFor(PROGRAM), programAddress: PROGRAM });
        store.set(removeCustomIdlAtom, PROGRAM);

        expect(store.get(programIdlPreferencesAtom)).toEqual({});
    });

    it('should switch between sources without losing the custom IDL', () => {
        const store = createStore();
        store.set(addCustomIdlAtom, { custom: customFor(PROGRAM), programAddress: PROGRAM });
        store.set(selectIdlSourceAtom, { programAddress: PROGRAM, selected: undefined });

        expect(store.get(programIdlPreferencesAtom)[PROGRAM]).toEqual({
            custom: customFor(PROGRAM),
            selected: undefined,
        });
    });
});
