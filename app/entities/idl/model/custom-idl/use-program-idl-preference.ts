import 'client-only';

import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

import {
    addCustomIdlAtom,
    type CustomIdlWriteResult,
    type IdlSourceSelection,
    type ProgramIdlPreference,
    type ProgramIdlPreferences,
    programIdlPreferencesAtom,
    removeCustomIdlAtom,
    selectIdlSourceAtom,
} from './custom-idl-store';
import { useCustomIdlAllowedHere } from './idl-surfaces';
import { parseCustomIdl } from './parse-custom-idl';

export type ProgramIdlPreferenceControls = {
    preference: ProgramIdlPreference | undefined;
    /** Validate `text` as an IDL for the program, store it, and select it. */
    addCustomIdl: (text: string, fileName?: string) => CustomIdlWriteResult;
    removeCustomIdl: () => void;
    selectIdlSource: (selected: IdlSourceSelection | undefined) => void;
};

export function useProgramIdlPreference(programAddress: string): ProgramIdlPreferenceControls {
    const stored = useAtomValue(programIdlPreferencesAtom)[programAddress];
    const preference = useAllowedHere(stored);
    const remove = useSetAtom(removeCustomIdlAtom);
    const select = useSetAtom(selectIdlSourceAtom);

    const add = useAddCustomIdl();
    const addCustomIdl = useCallback(
        (text: string, fileName?: string): CustomIdlWriteResult => add({ fileName, programAddress, text }),
        [add, programAddress],
    );
    const removeCustomIdl = useCallback(() => remove(programAddress), [remove, programAddress]);
    const selectIdlSource = useCallback(
        (selected: IdlSourceSelection | undefined) => select({ programAddress, selected }),
        [select, programAddress],
    );

    return { addCustomIdl, preference, removeCustomIdl, selectIdlSource };
}

/** Store a custom IDL for any program, for surfaces that let the user pick the program. */
export function useAddCustomIdl() {
    const add = useSetAtom(addCustomIdlAtom);
    return useCallback(
        ({ programAddress, text, fileName }: { programAddress: string; text: string; fileName?: string }) => {
            const parsed = parseCustomIdl(text, programAddress);
            if (!parsed.ok) return parsed;
            return add({ custom: { addedAt: Date.now(), fileName, idl: parsed.idl }, programAddress });
        },
        [add],
    );
}

/** Every stored preference, for hooks that resolve IDLs for a set of programs at once. */
export function useProgramIdlPreferences(): ProgramIdlPreferences {
    const stored = useAtomValue(programIdlPreferencesAtom);
    const allowed = useCustomIdlAllowedHere();
    return useMemo(
        () =>
            allowed
                ? stored
                : Object.fromEntries(
                      Object.entries(stored).map(([address, preference]) => [address, withoutCustom(preference)]),
                  ),
        [allowed, stored],
    );
}

// REVIEW(HOO-1971): on a page where the design menu turned the custom IDL off, a custom selection reads as the
// default on-chain policy; the stored IDL stays, for the selector and the catalog.
function useAllowedHere(preference: ProgramIdlPreference | undefined): ProgramIdlPreference | undefined {
    const allowed = useCustomIdlAllowedHere();
    return allowed ? preference : withoutCustom(preference);
}

function withoutCustom<T extends ProgramIdlPreference | undefined>(preference: T): T {
    return preference?.selected === 'custom' ? ({ ...preference, selected: undefined } as T) : preference;
}
