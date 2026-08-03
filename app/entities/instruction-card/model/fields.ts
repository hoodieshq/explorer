import type { PublicKey } from '@solana/web3.js';
import type { ReactNode } from 'react';

/**
 * A row in an instruction card, described as data.
 *
 * Cards declare *what* a field means; `InstructionFields` decides how to draw
 * it. That split is what lets the inspector swap the address renderer without
 * every card taking an `AddressComponent` prop.
 */
export type InstructionField =
    | { kind: 'address'; label: string; pubkey: PublicKey }
    | { kind: 'sol'; label: string; lamports: number | bigint }
    | { kind: 'bytes'; label: string; size: number }
    | { kind: 'seed'; label: string; seed: string }
    | { kind: 'text'; label: string; value: string | number }
    | { kind: 'custom'; label: string; value: ReactNode };

/** Falsy entries are dropped, so optional fields read as `cond && address(...)`. */
export type InstructionFieldList = ReadonlyArray<InstructionField | false | undefined | null>;

/** An account address. Links out on the tx page, resolves in-transaction in the inspector. */
export function address(label: string, pubkey: PublicKey): InstructionField {
    return { kind: 'address', label, pubkey };
}

/** A lamport amount, rendered as SOL. */
export function sol(label: string, lamports: number | bigint): InstructionField {
    return { kind: 'sol', label, lamports };
}

/** An account data size, rendered as `N byte(s)`. */
export function bytes(label: string, size: number): InstructionField {
    return { kind: 'bytes', label, size };
}

/** A PDA derivation seed, rendered as copyable code. */
export function seed(label: string, value: string): InstructionField {
    return { kind: 'seed', label, seed: value };
}

/** Plain text or a number. Deliberately not `ReactNode` — use `custom` for markup. */
export function text(label: string, value: string | number): InstructionField {
    return { kind: 'text', label, value };
}

/**
 * Escape hatch for fields the vocabulary above does not cover — token amounts
 * needing mint decimals, nested structs, bespoke widgets. Prefer a new `kind`
 * once a shape repeats across programs.
 */
export function custom(label: string, value: ReactNode): InstructionField {
    return { kind: 'custom', label, value };
}

export function compactFields(fields: InstructionFieldList): InstructionField[] {
    return fields.filter((field): field is InstructionField => Boolean(field));
}
