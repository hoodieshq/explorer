import type { parseAccountData, parseInstruction } from '@codama/dynamic-parsers';
import type { Idl } from '@coral-xyz/anchor';
import type { Instruction, ReadonlyUint8Array } from '@solana/kit';
import { type AccountNode, getLastNodeFromPath, type InstructionNode, type RootNode } from 'codama';

import { IDL_ERROR__DECODE_KIND_MISMATCH, IdlError } from './errors.js';

/** An Anchor IDL — the `@coral-xyz/anchor` `Idl`; only the modern (>= 0.30) spec is supported. */
export type AnchorIdl = Idl;
/** A Codama IDL — the Codama `RootNode` (as the program-metadata program stores them). */
export type CodamaIdl = RootNode;
/** Either supported IDL standard. */
export type SupportedIdl = AnchorIdl | CodamaIdl;

// Codama's node types brand every name (CamelCaseString), so literal IDLs (as-const/generated)
// never extend RootNode — the structural shape below lets them in WITHOUT erasing their literals.
export type CodamaIdlInput = {
    kind: 'rootNode';
    program: {
        accounts: readonly unknown[];
        definedTypes: readonly unknown[];
        instructions: readonly unknown[];
        name: string;
        publicKey: string;
        version: string;
    };
};

/** What the client accepts statically: brands are not required, only the structure (runtime detection still applies). */
export type SupportedIdlInput = CodamaIdlInput | SupportedIdl;

/** A pre-0.30 Anchor IDL — deliberately NOT in `SupportedIdl`; the client rejects it, consumers decode it themselves. */
export type LegacyAnchorIdl = {
    instructions: readonly { name: string }[];
    name: string;
    version: string;
};

export enum IdlStandard {
    Anchor = 'anchor',
    Codama = 'codama',
}

/** The IDL's format version: the Codama root `version`, or Anchor's `metadata.spec` (see `getIdlVersion`). */
export type IdlVersion = AnchorIdl['metadata']['spec'] | RootNode['version'];

// Codama payloads carry the real engine output. Anchor payloads stay unknown BY DESIGN — no typed
// variant is coming: the anchor arm only carries the consumer's own fallbackDecoder rescue when codama
// parsing cannot decode, so the payload shape is the consumer's to declare, never the library's.
export type CodamaDecodedInstruction = NonNullable<ReturnType<typeof parseInstruction>>;
export type CodamaDecodedAccount = NonNullable<ReturnType<typeof parseAccountData>>;
export type AnchorDecodedInstruction = unknown;
export type AnchorDecodedAccount = unknown;

/**
 * A decoded instruction — discriminated by the standard that produced the decode.
 * Unknown-arm contract: `errors: []` is a plain miss (no discriminator match); non-empty means the
 * pipeline failed on the way. A fallback-decoder rescue keeps the bypassed errors in `recoveredFrom`.
 */
export type InstructionDecode =
    | { kind: IdlStandard.Anchor; decoded: AnchorDecodedInstruction; recoveredFrom?: readonly IdlError[] }
    | { kind: IdlStandard.Codama; decoded: CodamaDecodedInstruction }
    | { kind: 'unknown'; errors: readonly IdlError[] };

/** A decoded account — same discrimination, unknown-arm `errors`, and rescue contract as {@link InstructionDecode}. */
export type AccountDecode =
    | { kind: IdlStandard.Anchor; decoded: AnchorDecodedAccount; recoveredFrom?: readonly IdlError[] }
    | { kind: IdlStandard.Codama; decoded: CodamaDecodedAccount }
    | { kind: 'unknown'; errors: readonly IdlError[] };

// Arm constructors — one place owns the `kind` literals and the rescue contract (empty `recoveredFrom` is omitted).
export function anchorArm<T>(
    decoded: T,
    recoveredFrom?: readonly IdlError[],
): { decoded: T; kind: IdlStandard.Anchor; recoveredFrom?: readonly IdlError[] } {
    return recoveredFrom?.length
        ? { decoded, kind: IdlStandard.Anchor, recoveredFrom }
        : { decoded, kind: IdlStandard.Anchor };
}

export function codamaArm<T>(decoded: T): { decoded: T; kind: IdlStandard.Codama } {
    return { decoded, kind: IdlStandard.Codama };
}

export function unknownArm(errors: readonly IdlError[]): { errors: readonly IdlError[]; kind: 'unknown' } {
    return { errors, kind: 'unknown' };
}

/**
 * Unwrap the default (codama) arm's decode envelope — the payload plus `node`, the matched schema
 * (InstructionNode/AccountNode) for runtime schema-driven consumers: render by `node` kinds instead
 * of guessing from values. Throws a typed IdlError (`IDL_ERROR__DECODE_KIND_MISMATCH`) on any other
 * arm — other kinds get qualified unwraps as they land (e.g. a future `unwrapAnchor`).
 *
 * @example const { data, node } = unwrap(client.decodeAccount(bytes)); // node: AccountNode
 */
export function unwrap(decode: InstructionDecode): CodamaDecodedInstruction & { node: InstructionNode };
export function unwrap(decode: AccountDecode): CodamaDecodedAccount & { node: AccountNode };
export function unwrap(
    decode: AccountDecode | InstructionDecode,
): (CodamaDecodedAccount & { node: AccountNode }) | (CodamaDecodedInstruction & { node: InstructionNode }) {
    if (decode.kind !== IdlStandard.Codama) {
        throw new IdlError(IDL_ERROR__DECODE_KIND_MISMATCH, { expected: IdlStandard.Codama, received: decode.kind });
    }
    const decoded = decode.decoded;
    // narrow the envelope union first — TS cannot correlate path/node pairs across it in one expression
    if ('accounts' in decoded) return { ...decoded, node: getLastNodeFromPath(decoded.path) };
    return { ...decoded, node: getLastNodeFromPath(decoded.path) };
}

// An Anchor client may still fall back to Codama, so only the Codama client narrows an arm away.
// The check is structural (kind: 'rootNode') so literal IDLs narrow like branded ones.
export type InstructionDecodeFor<T extends SupportedIdlInput> = T extends { kind: 'rootNode' }
    ? Exclude<InstructionDecode, { kind: IdlStandard.Anchor }>
    : InstructionDecode;

export type AccountDecodeFor<T extends SupportedIdlInput> = T extends { kind: 'rootNode' }
    ? Exclude<AccountDecode, { kind: IdlStandard.Anchor }>
    : AccountDecode;

/** Handler map keyed by the decode arms possible for the client's IDL standard. */
export type InstructionHandlers<T extends SupportedIdlInput, R> = {
    [K in InstructionDecodeFor<T>['kind']]: (decode: Extract<InstructionDecodeFor<T>, { kind: K }>) => R;
};

/** Handler map keyed by the decode arms possible for the client's IDL standard. */
export type AccountHandlers<T extends SupportedIdlInput, R> = {
    [K in AccountDecodeFor<T>['kind']]: (decode: Extract<AccountDecodeFor<T>, { kind: K }>) => R;
};

/**
 * Loads a program's raw IDL JSON by address, whatever its nature (PMP, Anchor PDA, a registry, a
 * file). Resolves `undefined` when the program has no IDL; throws only on transport failure or
 * abort — a blip stays retryable and is never mistaken for "no IDL". The reference implementation
 * lives behind '@explorer/idl/fetch' (`createLatestIdlFetcher`).
 */
export type IdlFetcher = (programAddress: string, config?: { abortSignal?: AbortSignal }) => Promise<unknown>;

/** The Anchor escape hatch — rescues what the pipeline cannot decode; always injected, never bundled. */
export type FallbackDecoder = {
    decodeAccount?: (idl: AnchorIdl, data: ReadonlyUint8Array) => AnchorDecodedAccount | undefined;
    decodeInstruction?: (idl: AnchorIdl, ix: Instruction) => AnchorDecodedInstruction | undefined;
};

export type FallbackDecoderOptions = {
    fallbackDecoder?: FallbackDecoder;
};

/**
 * A decode engine bound to the client — it receives the client's IDL per call and decodes against
 * it. The main entry defaults to the codama engine ('@explorer/idl/codama' also ships it standalone);
 * pass a custom provider to swap the pipeline. Payload TYPES are not the provider's concern: they
 * derive from the IDL type itself (see src/infer).
 */
export type IdlDecodeProvider = {
    decodeAccount(idl: SupportedIdl, data: ReadonlyUint8Array, options?: FallbackDecoderOptions): AccountDecode;
    decodeInstruction(idl: SupportedIdl, ix: Instruction, options?: FallbackDecoderOptions): InstructionDecode;
};
