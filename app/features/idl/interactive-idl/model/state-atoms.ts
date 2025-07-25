import { atom } from 'jotai';

import type { UnifiedProgram } from './unified-program';
const program = atom<UnifiedProgram | undefined>();

/// store program instance
export const programAtom = atom(
    get => {
        const v = get(program);
        // if (v === undefined) throw new Error('programId is absent');
        return v;
    },
    (_get, set, next: UnifiedProgram | undefined) => {
        set(program, next);
    }
);

// TODO: move idl and program Id here
