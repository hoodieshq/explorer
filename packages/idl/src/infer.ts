// Type-level payload inference from the IDL document itself. Works when the IDL is a compile-time
// literal (anchor-generated types, or generated codama literal modules); runtime-fetched documents
// type as the wide AnchorIdl/CodamaIdl and every shape below deliberately degrades to `unknown`.
import type { Address, ReadonlyUint8Array } from '@solana/kit';
import type { CamelCaseString } from 'codama';

import type { AnchorIdl, SupportedIdlInput } from './types.js';

/**
 * @internal — not exported from the package entry. Bridges @codama/renderers-js-generated types
 * (build-time codegen, type-only imports) to what @codama/dynamic-parsers actually returns: branded
 * addresses decode as plain base58 strings and byte fields as [encoding, data] tuples; kit Option
 * objects and bigints already match. Used by the decode tests to pin output against generated clients.
 */
export type AsDecoded<T> = T extends Address
    ? string
    : T extends ReadonlyUint8Array | Uint8Array
      ? [string, string]
      : T extends bigint | boolean | number | string
        ? T
        : T extends readonly (infer E)[]
          ? AsDecoded<E>[]
          : T extends object
            ? { [K in keyof T]: AsDecoded<T[K]> }
            : T;

// Matches the CODAMA runtime output (bigint for 64/128-bit ints, base58 string for pubkeys, bytes as
// [encoding, data] tuples) — NOT anchor's BN/Uint8Array mapping; the anchor arm decodes through the
// same codama pipeline, so its bytes come back as tuples too.
type ScalarMap = {
    bool: boolean;
    bytes: [string, string];
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

// A no-field payload (a no-args instruction, an empty struct) — a real empty object, not the `{}` top type.
type EmptyStruct = Record<string, never>;

type FieldsObject<F> = F extends readonly { name: string; type: unknown }[]
    ? string extends F[number]['name']
        ? unknown // wide document — field names are not literal
        : F extends readonly []
          ? EmptyStruct
          : { [Item in F[number] as Item['name'] & string]: FieldType<Item['type']> }
    : unknown;

// Wide codama documents carry branded names (CamelCaseString); literal documents carry plain literals.
type IsLiteralName<N> = CamelCaseString extends N ? false : string extends N ? false : N extends string ? true : false;

type CodamaNumber<F> = F extends 'i64' | 'i128' | 'i256' | 'u64' | 'u128' | 'u256' ? bigint : number;

// @codama/dynamic-parsers types decoded `data` as `unknown`, so this reconstructs the payload type from
// the IDL node types to match the parser's RUNTIME shape: bytes as [encoding, data] tuples, options as
// kit Option objects, scalar enums as variant indices. Unsupported kinds degrade to `unknown`.
type CodamaValue<TRoot, TNode> = TNode extends { format: infer F; kind: 'numberTypeNode' }
    ? CodamaNumber<F>
    : TNode extends { kind: 'publicKeyTypeNode' }
      ? string
      : TNode extends { kind: 'stringTypeNode' }
        ? string
        : TNode extends { kind: 'booleanTypeNode' }
          ? boolean
          : TNode extends { kind: 'bytesTypeNode' }
            ? [string, string]
            : TNode extends {
                    kind:
                        | 'fixedSizeTypeNode'
                        | 'hiddenPrefixTypeNode'
                        | 'hiddenSuffixTypeNode'
                        | 'postOffsetTypeNode'
                        | 'preOffsetTypeNode'
                        | 'sizePrefixTypeNode';
                    type: infer Inner;
                }
              ? CodamaValue<TRoot, Inner>
              : TNode extends { kind: 'amountTypeNode' | 'dateTimeTypeNode' | 'solAmountTypeNode'; number: infer Inner }
                ? CodamaValue<TRoot, Inner>
                : TNode extends { item: infer Item; kind: 'optionTypeNode' | 'zeroableOptionTypeNode' }
                  ? { __option: 'None' } | { __option: 'Some'; value: CodamaValue<TRoot, Item> }
                  : TNode extends { item: infer Item; kind: 'arrayTypeNode' }
                    ? CodamaValue<TRoot, Item>[]
                    : TNode extends { fields: infer F; kind: 'structTypeNode' }
                      ? CodamaFieldsObject<TRoot, F>
                      : TNode extends { kind: 'enumTypeNode'; variants: infer V }
                        ? V extends readonly { kind: 'enumEmptyVariantTypeNode' }[]
                            ? number // scalar enums decode to the variant index
                            : unknown
                        : TNode extends { kind: 'definedTypeLinkNode'; name: infer N }
                          ? ResolveDefinedType<TRoot, N>
                          : unknown;

type CodamaFieldsObject<TRoot, F> = F extends readonly { name: string; type: unknown }[]
    ? F extends readonly []
        ? EmptyStruct
        : IsLiteralName<F[number]['name']> extends false
          ? unknown // wide document — field names are not literal
          : { [Item in F[number] as Item['name'] & string]: CodamaValue<TRoot, Item['type']> }
    : unknown;

type ResolveDefinedType<TRoot, N> = TRoot extends { program: { definedTypes: readonly (infer D)[] } }
    ? Extract<D, { name: N }> extends { type: infer TN }
        ? CodamaValue<TRoot, TN>
        : unknown
    : unknown;

/** Decoded instruction payload derived from the IDL type — the union of every instruction's args. */
export type InstructionDataOf<T extends SupportedIdlInput> = T extends AnchorIdl
    ? FieldsObject<T['instructions'][number]['args']>
    : T extends { program: { instructions: readonly (infer I)[] } }
      ? I extends { arguments: infer A }
          ? CodamaFieldsObject<T, A>
          : unknown
      : unknown;

/** Decoded account payload derived from the IDL type — the union of every declared account struct. */
export type AccountDataOf<T extends SupportedIdlInput> = T extends AnchorIdl
    ? T extends { accounts: readonly { name: infer N }[]; types: readonly (infer TD)[] }
        ? string extends N
            ? unknown // wide document — account names are not literal
            : Extract<TD, { name: N }> extends { type: { fields: infer F } }
              ? FieldsObject<F>
              : unknown
        : unknown
    : T extends { program: { accounts: readonly (infer A)[] } }
      ? A extends { data: infer D }
          ? CodamaValue<T, D>
          : unknown
      : unknown;
