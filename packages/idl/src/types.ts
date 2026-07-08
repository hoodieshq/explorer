import type { parseAccountData, parseInstruction } from '@codama/dynamic-parsers';
import type { Idl } from '@coral-xyz/anchor';
import type { Instruction } from '@solana/kit';
import type { RootNode } from 'codama';

import type { IdlError } from './errors.js';

/** An Anchor IDL — the `@coral-xyz/anchor` `Idl`; only the modern (>= 0.30) spec is supported. */
export type AnchorIdl = Idl;
/** A Codama IDL — the Codama `RootNode` (as the program-metadata program stores them). */
export type CodamaIdl = RootNode;
/** Either supported IDL standard. */
export type SupportedIdl = AnchorIdl | CodamaIdl;

// Codama's node types brand every name (CamelCaseString), so literal documents (as-const/generated)
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

/** The document's format version: the Codama root `version`, or Anchor's `metadata.spec` (see `getIdlVersion`). */
export type IdlVersion = AnchorIdl['metadata']['spec'] | RootNode['version'];

// Codama payloads carry the real engine output; Anchor payloads stay opaque until the Anchor-rich
// path lands (mcp-endpoint Step 6) — today they only come from the injected legacy decoder.
export type CodamaDecodedInstruction = NonNullable<ReturnType<typeof parseInstruction>>;
export type CodamaDecodedAccount = NonNullable<ReturnType<typeof parseAccountData>>;
export type AnchorDecodedInstruction = unknown;
export type AnchorDecodedAccount = unknown;

/**
 * A decoded instruction — discriminated by the standard that produced the decode.
 * Unknown-arm contract: `errors: []` is a plain miss (no discriminator match); non-empty means the
 * pipeline failed on the way. A legacy-decoder rescue keeps the bypassed errors in `recoveredFrom`.
 */
export type InstructionDecode =
    | { kind: IdlStandard.Anchor; decoded: AnchorDecodedInstruction; recoveredFrom?: readonly IdlError[] }
    | { kind: IdlStandard.Codama; decoded: CodamaDecodedInstruction }
    | { kind: 'unknown'; errors: readonly IdlError[] };

/** A decoded account — same discrimination and unknown-arm `errors` contract as {@link InstructionDecode}. */
export type AccountDecode =
    | { kind: IdlStandard.Anchor; decoded: AnchorDecodedAccount }
    | { kind: IdlStandard.Codama; decoded: CodamaDecodedAccount }
    | { kind: 'unknown'; errors: readonly IdlError[] };

// An Anchor client may still fall back to Codama, so only the Codama client narrows an arm away.
// The check is structural (kind: 'rootNode') so literal documents narrow like branded ones.
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

/** The legacy-Anchor escape hatch — always injected, never bundled. */
export type LegacyDecoderOptions = {
    legacyAnchorDecoder?: (idl: AnchorIdl, ix: Instruction) => AnchorDecodedInstruction | undefined;
};

/**
 * A decode engine bound to the client — it receives the client's IDL per call and decodes against
 * it. Providers live behind subpath entries ('@explorer/idl/codama' ships the standard engine) so
 * processes that never decode never load one. Payload TYPES are not the provider's concern: they
 * derive from the IDL type itself (see infer.ts).
 */
export type IdlDecodeProvider = {
    decodeAccount(idl: SupportedIdl, data: Uint8Array): AccountDecode;
    decodeInstruction(idl: SupportedIdl, ix: Instruction, options?: LegacyDecoderOptions): InstructionDecode;
};
