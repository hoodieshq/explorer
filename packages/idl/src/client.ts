import type { Instruction } from '@solana/kit';

import {
    getIdlProgramAddress,
    getIdlProgramVersion,
    getIdlStandard,
    getIdlVersion,
    isAnchorIdl,
    isCodamaIdl,
    isSupportedIdl,
} from './detect.js';
import {
    err,
    IDL_ERROR__ACCOUNT_DECODE_FAILED,
    IDL_ERROR__DECODE_KIND_MISMATCH,
    IDL_ERROR__INSTRUCTION_DECODE_FAILED,
    IDL_ERROR__MISSING_DECODE_HANDLER,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    IdlError,
    ok,
    type Result,
} from './errors.js';
import type { AccountDataOf, InstructionDataOf } from './infer.js';
import { buildInstructionNameTable, buildProgramName, matchInstructionName } from './names.js';
import {
    type AccountDecode,
    type AccountDecodeFor,
    type AccountHandlers,
    type AnchorIdl,
    type CodamaIdl,
    type FallbackDecoderOptions,
    type IdlDecodeProvider,
    IdlStandard,
    type InstructionDecode,
    type InstructionDecodeFor,
    type InstructionHandlers,
    type IdlVersion,
    type SupportedIdl,
    type SupportedIdlInput,
} from './types.js';

export type IdlClientOptions = FallbackDecoderOptions & {
    /** Decode engine — an explicit choice so processes that never decode never load one ('@explorer/idl/codama' ships the default). */
    provider: IdlDecodeProvider;
};

/** Engine-free client over one IDL — names and metadata only; decoding requires a provider (see {@link IdlClient}). */
export type IdlMetaClient<T extends SupportedIdlInput = SupportedIdl> = {
    readonly idl: T;
    programAddress(): string | undefined;
    programName(): string | undefined;
    /** The program's own semver, when the IDL carries one — distinct from the format version. */
    programVersion(): string | undefined;
    /** The IDL's format version: the Codama root `version`, or Anchor's `metadata.spec`. */
    formatVersion(): IdlVersion;
    instructionName(data: Uint8Array): string | undefined;
};

/**
 * Parsed-data client over one IDL. Decode results narrow statically to the IDL's standard;
 * handler-map overloads let consumers declare outcomes instead of branching; {@link getDecodedData}
 * payload types derive from the IDL type (literal documents infer, wide runtime documents degrade
 * to `unknown` — declare the shape per call in that case).
 */
export type IdlClient<T extends SupportedIdlInput = SupportedIdl> = IdlMetaClient<T> & {
    decodeInstruction: {
        (ix: Instruction): InstructionDecodeFor<T>;
        <R>(ix: Instruction, handlers: InstructionHandlers<T, R>): R;
    };
    decodeAccount: {
        (data: Uint8Array): AccountDecodeFor<T>;
        <R>(data: Uint8Array, handlers: AccountHandlers<T, R>): R;
    };
    /** {@link decodeAccount} + {@link getDecodedData} in one error-first step; a mismatched `expectedKind` is an error. */
    decodeAccountData: <TData = AccountDataOf<T>>(data: Uint8Array, expectedKind?: IdlStandard) => Result<TData>;
    /** {@link decodeInstruction} + {@link getDecodedData} in one error-first step; a mismatched `expectedKind` is an error. */
    decodeInstructionData: <TData = InstructionDataOf<T>>(ix: Instruction, expectedKind?: IdlStandard) => Result<TData>;
    /** Decoded payload typed from the IDL; `undefined` only for the unknown arm — narrowing `decode.kind` first drops it. */
    getDecodedData: {
        <TData = InstructionDataOf<T>>(decode: Extract<InstructionDecode, { kind: IdlStandard }>): TData;
        <TData = AccountDataOf<T>>(decode: Extract<AccountDecode, { kind: IdlStandard }>): TData;
        <TData = InstructionDataOf<T>>(decode: InstructionDecode): TData | undefined;
        <TData = AccountDataOf<T>>(decode: AccountDecode): TData | undefined;
    };
};

/**
 * Client for a known-supported IDL; throws on a value that fails runtime detection (lying type) —
 * use {@link tryCreateIdlClient} for untrusted input. Assumes the IDL is not mutated after construction
 * (the instruction name table is precomputed).
 */
export function createIdlClient<T extends SupportedIdlInput>(idl: T, options: IdlClientOptions): IdlClient<T>;
export function createIdlClient<T extends SupportedIdlInput>(idl: T): IdlMetaClient<T>;
export function createIdlClient<T extends SupportedIdlInput>(
    idl: T,
    options?: IdlClientOptions,
): IdlClient<T> | IdlMetaClient<T> {
    if (!isSupportedIdl(idl)) throw unsupportedIdl();
    // the guard's narrowing does not reach the nested function declarations — alias it once
    const supportedIdl: SupportedIdl = idl;

    const table = buildInstructionNameTable(supportedIdl);
    const metaClient: IdlMetaClient<T> = {
        idl,
        formatVersion: () => getIdlVersion(supportedIdl),
        instructionName: data => matchInstructionName(table, data),
        programAddress: () => getIdlProgramAddress(idl),
        programName: () => buildProgramName(idl),
        programVersion: () => getIdlProgramVersion(supportedIdl),
    };
    if (!options) return metaClient;

    const { provider, ...fallbackOptions } = options;

    function decodeInstruction(ix: Instruction): InstructionDecodeFor<T>;
    function decodeInstruction<R>(ix: Instruction, handlers: InstructionHandlers<T, R>): R;
    function decodeInstruction<R>(ix: Instruction, handlers?: InstructionHandlers<T, R>) {
        const decode = provider.decodeInstruction(supportedIdl, ix, fallbackOptions);
        if (!handlers) return decode;
        return dispatch(decode, handlers);
    }

    function decodeAccount(data: Uint8Array): AccountDecodeFor<T>;
    function decodeAccount<R>(data: Uint8Array, handlers: AccountHandlers<T, R>): R;
    function decodeAccount<R>(data: Uint8Array, handlers?: AccountHandlers<T, R>) {
        const decode = provider.decodeAccount(supportedIdl, data, fallbackOptions);
        if (!handlers) return decode;
        return dispatch(decode, handlers);
    }

    function decodeInstructionData<TData = InstructionDataOf<T>>(
        ix: Instruction,
        expectedKind?: IdlStandard,
    ): Result<TData> {
        const decode = decodeInstruction(ix);
        if (decode.kind === 'unknown') {
            // surface the pipeline's own failure rather than masking it; a plain miss gets a fresh error
            return err(
                decode.errors[0] ??
                    new IdlError(IDL_ERROR__INSTRUCTION_DECODE_FAILED, {
                        programAddress: ix.programAddress,
                        standard: getIdlStandard(supportedIdl),
                    }),
            );
        }
        if (expectedKind !== undefined && decode.kind !== expectedKind) {
            return err(
                new IdlError(IDL_ERROR__DECODE_KIND_MISMATCH, { expected: expectedKind, received: decode.kind }),
            );
        }
        return ok(getDecodedData<TData>(decode));
    }

    function decodeAccountData<TData = AccountDataOf<T>>(data: Uint8Array, expectedKind?: IdlStandard): Result<TData> {
        const decode = decodeAccount(data);
        if (decode.kind === 'unknown') {
            return err(
                decode.errors[0] ??
                    new IdlError(IDL_ERROR__ACCOUNT_DECODE_FAILED, {
                        dataLength: data.length,
                        standard: getIdlStandard(supportedIdl),
                    }),
            );
        }
        if (expectedKind !== undefined && decode.kind !== expectedKind) {
            return err(
                new IdlError(IDL_ERROR__DECODE_KIND_MISMATCH, { expected: expectedKind, received: decode.kind }),
            );
        }
        return ok(getDecodedData<TData>(decode));
    }

    function getDecodedData<TData = InstructionDataOf<T>>(
        decode: Extract<InstructionDecode, { kind: IdlStandard }>,
    ): TData;
    function getDecodedData<TData = AccountDataOf<T>>(decode: Extract<AccountDecode, { kind: IdlStandard }>): TData;
    function getDecodedData<TData = InstructionDataOf<T>>(decode: InstructionDecode): TData | undefined;
    function getDecodedData<TData = AccountDataOf<T>>(decode: AccountDecode): TData | undefined;
    // eslint-disable-next-line unicorn/consistent-function-scoping -- the overload defaults capture the client's T type parameter (a type-level closure)
    function getDecodedData<TData>(decode: AccountDecode | InstructionDecode) {
        const data =
            decode.kind === IdlStandard.Codama
                ? decode.decoded.data
                : decode.kind === IdlStandard.Anchor
                  ? decode.decoded
                  : undefined;
        // eslint-disable-next-line typescript/consistent-type-assertions -- dynamically decoded payload; the IDL-derived (or caller-declared) shape is the contract
        return data as TData | undefined;
    }

    return {
        ...metaClient,
        decodeAccount,
        decodeAccountData,
        decodeInstruction,
        decodeInstructionData,
        getDecodedData,
    };
}

/** Detect and wrap untrusted input — error-first result instead of a throw. */
export function tryCreateIdlClient(
    idl: unknown,
    options: IdlClientOptions,
): Result<IdlClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT>;
export function tryCreateIdlClient(idl: unknown): Result<IdlMetaClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT>;
export function tryCreateIdlClient(
    idl: unknown,
    options?: IdlClientOptions,
): Result<IdlClient | IdlMetaClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT> {
    if (!isSupportedIdl(idl)) return err(unsupportedIdl());
    return ok(options ? createIdlClient(idl, options) : createIdlClient(idl));
}

export function isAnchorStandard(client: IdlClient): client is IdlClient<AnchorIdl>;
export function isAnchorStandard(client: IdlMetaClient): client is IdlMetaClient<AnchorIdl>;
export function isAnchorStandard(client: IdlMetaClient): boolean {
    return isAnchorIdl(client.idl);
}

export function isCodamaStandard(client: IdlClient): client is IdlClient<CodamaIdl>;
export function isCodamaStandard(client: IdlMetaClient): client is IdlMetaClient<CodamaIdl>;
export function isCodamaStandard(client: IdlMetaClient): boolean {
    return isCodamaIdl(client.idl);
}

function unsupportedIdl(): IdlError<typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT> {
    return new IdlError(IDL_ERROR__UNSUPPORTED_IDL_FORMAT);
}

type AnyDecode = AccountDecode | InstructionDecode;

// Runtime-only widening — the public overloads enforce totality, so a miss here means the caller bypassed the types.
type AnyHandlers<R> = {
    anchor?: (decode: Extract<AnyDecode, { kind: IdlStandard.Anchor }>) => R;
    codama?: (decode: Extract<AnyDecode, { kind: IdlStandard.Codama }>) => R;
    unknown?: (decode: Extract<AnyDecode, { kind: 'unknown' }>) => R;
};

function dispatch<R>(decode: AnyDecode, handlers: object): R {
    // eslint-disable-next-line typescript/consistent-type-assertions -- an instruction dispatch only ever receives instruction handlers (and accounts likewise); TS cannot correlate the pairs across the widened union
    const map = handlers as AnyHandlers<R>;
    if (decode.kind === IdlStandard.Anchor && map.anchor) return map.anchor(decode);
    if (decode.kind === IdlStandard.Codama && map.codama) return map.codama(decode);
    if (decode.kind === 'unknown' && map.unknown) return map.unknown(decode);
    throw new IdlError(IDL_ERROR__MISSING_DECODE_HANDLER, { kind: decode.kind });
}
