import type { PublicKey } from '@solana/web3.js';
import { atom } from 'jotai';

const programId = atom<PublicKey | undefined>();

/// simple atom to store IDL at the runtime
export const programIdAtom = atom(
    get => get(programId),
    (_get, set, next: PublicKey) => {
        set(programId, next);
    }
);

export const unsetProgramId = atom(null, (_, set) => {
    set(programId, undefined);
});
