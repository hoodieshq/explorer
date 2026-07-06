// Type-level payload inference from the IDL document itself. Works when the IDL is a compile-time
// literal (anchor-generated types); runtime-fetched documents type as the wide AnchorIdl/CodamaIdl
// and every shape below deliberately degrades to `unknown`.
import type { AnchorIdl, SupportedIdl } from './types';

// Matches the CODAMA runtime output (bigint for 64/128-bit ints, base58 string for pubkeys) — NOT
// anchor's BN mapping; this package decodes through the codama pipeline.
type ScalarMap = {
    bool: boolean;
    bytes: Uint8Array;
    f32: number;
    f64: number;
    i8: number;
    i16: number;
    i32: number;
    i64: bigint;
    i128: bigint;
    i256: bigint;
    pubkey: string;
    string: string;
    u8: number;
    u16: number;
    u32: number;
    u64: bigint;
    u128: bigint;
    u256: bigint;
};

// Non-scalar field types (defined/vec/option/…) stay unknown until they are needed.
type FieldType<T> = T extends keyof ScalarMap ? ScalarMap[T] : unknown;

type FieldsObject<F> = F extends readonly { name: string; type: unknown }[]
    ? string extends F[number]['name']
        ? unknown // wide document — field names are not literal
        : { [Item in F[number] as Item['name'] & string]: FieldType<Item['type']> }
    : unknown;

/** Decoded instruction payload derived from the IDL type — the union of every instruction's args. */
export type InstructionDataOf<T extends SupportedIdl> = T extends AnchorIdl
    ? FieldsObject<T['instructions'][number]['args']>
    : unknown;

/** Decoded account payload derived from the IDL type — the union of every declared account struct. */
export type AccountDataOf<T extends SupportedIdl> = T extends AnchorIdl
    ? T extends { accounts: readonly { name: infer N }[]; types: readonly (infer TD)[] }
        ? string extends N
            ? unknown // wide document — account names are not literal
            : Extract<TD, { name: N }> extends { type: { fields: infer F } }
              ? FieldsObject<F>
              : unknown
        : unknown
    : unknown;
