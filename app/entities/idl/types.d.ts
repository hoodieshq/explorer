import { Idl } from '@coral-xyz/anchor';

export type IdlFormatter = (idl: any, programAddress?: string) => Idl;
