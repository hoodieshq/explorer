import type { parseAccountData, parseInstruction } from '@codama/dynamic-parsers';
import type { Idl } from '@coral-xyz/anchor';
import type { RootNode } from 'codama';

import type { IdlError } from './errors';

/** An Anchor IDL — the `@coral-xyz/anchor` `Idl`; only the modern (>= 0.30) spec is supported. */
export type AnchorIdl = Idl;
/** A Codama IDL — the Codama `RootNode` (as the program-metadata program stores them). */
export type CodamaIdl = RootNode;
/** Either supported IDL standard. */
export type SupportedIdl = AnchorIdl | CodamaIdl;

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

/** Standard-era label: the Codama root format version, or the modern-Anchor wildcard (see `getIdlVersion`). */
export type IdlVersion = '0.30.1' | RootNode['version'];

// Codama payloads carry the real engine output; Anchor payloads stay opaque until the Anchor-rich
// path lands (mcp-endpoint Step 6) — today they only come from the injected legacy decoder.
export type CodamaDecodedInstruction = NonNullable<ReturnType<typeof parseInstruction>>;
export type CodamaDecodedAccount = NonNullable<ReturnType<typeof parseAccountData>>;
export type AnchorDecodedInstruction = unknown;
export type AnchorDecodedAccount = unknown;

/** A decoded instruction — discriminated by the standard that produced the decode. */
export type InstructionDecode =
    | { kind: IdlStandard.Anchor; decoded: AnchorDecodedInstruction }
    | { kind: IdlStandard.Codama; decoded: CodamaDecodedInstruction }
    | { kind: 'unknown'; errors: IdlError[] };

/** A decoded account — discriminated by the standard that produced the decode. */
export type AccountDecode =
    | { kind: IdlStandard.Anchor; decoded: AnchorDecodedAccount }
    | { kind: IdlStandard.Codama; decoded: CodamaDecodedAccount }
    | { kind: 'unknown'; errors: IdlError[] };

// An Anchor client may still fall back to Codama, so only the Codama client narrows an arm away.
export type InstructionDecodeFor<T extends SupportedIdl> = T extends CodamaIdl
    ? Exclude<InstructionDecode, { kind: IdlStandard.Anchor }>
    : InstructionDecode;

export type AccountDecodeFor<T extends SupportedIdl> = T extends CodamaIdl
    ? Exclude<AccountDecode, { kind: IdlStandard.Anchor }>
    : AccountDecode;

/** Handler map keyed by the decode arms possible for the client's IDL standard. */
export type InstructionHandlers<T extends SupportedIdl, R> = {
    [K in InstructionDecodeFor<T>['kind']]: (decode: Extract<InstructionDecodeFor<T>, { kind: K }>) => R;
};

/** Handler map keyed by the decode arms possible for the client's IDL standard. */
export type AccountHandlers<T extends SupportedIdl, R> = {
    [K in AccountDecodeFor<T>['kind']]: (decode: Extract<AccountDecodeFor<T>, { kind: K }>) => R;
};
