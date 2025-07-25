import { atom } from 'jotai';

import { BaseIdl } from './unified-program';

const orignalIdl = atom<BaseIdl | undefined>();

/// simple atom to store IDL at the runtime
export const originalIdlAtom = atom(
    get => {
        const v = get(orignalIdl);
        // if (v === undefined) throw new Error('orignalIdl is absent');
        return v;
    },
    (_get, set, next: BaseIdl) => {
        set(orignalIdl, next);
    }
);

export const unsetOriginalIdl = atom(null, (_, set) => {
    set(orignalIdl, undefined);
});
