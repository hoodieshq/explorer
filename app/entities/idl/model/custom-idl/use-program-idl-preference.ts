import 'client-only';

import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';

import {
    addCustomIdlAtom,
    type CustomIdlWriteResult,
    type IdlSourceSelection,
    type ProgramIdlPreference,
    programIdlPreferencesAtom,
    removeCustomIdlAtom,
    selectIdlSourceAtom,
} from './custom-idl-store';
import { parseCustomIdl } from './parse-custom-idl';

export type ProgramIdlPreferenceControls = {
    preference: ProgramIdlPreference | undefined;
    /** Validate `text` as an IDL for the program, store it, and select it. */
    addCustomIdl: (text: string, fileName?: string) => CustomIdlWriteResult;
    removeCustomIdl: () => void;
    selectIdlSource: (selected: IdlSourceSelection | undefined) => void;
};

export function useProgramIdlPreference(programAddress: string): ProgramIdlPreferenceControls {
    const preference = useAtomValue(programIdlPreferencesAtom)[programAddress];
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
export function useProgramIdlPreferences() {
    return useAtomValue(programIdlPreferencesAtom);
}
