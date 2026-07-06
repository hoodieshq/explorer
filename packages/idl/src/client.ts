import type { Instruction } from '@solana/kit';

import { codamaProvider } from './codama';
import { getIdlProgramAddress, isAnchorIdl, isCodamaIdl, isSupportedIdl } from './detect';
import type { AccountDataOf, InstructionDataOf } from './infer';
import {
    err,
    IDL_ERROR__MISSING_DECODE_HANDLER,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    IdlError,
    ok,
    type Result,
} from './errors';
import { buildInstructionNameTable, buildProgramName, matchInstructionName } from './names';
import {
    type AccountDecode,
    type AccountDecodeFor,
    type AccountHandlers,
    type AnchorIdl,
    type CodamaIdl,
    type IdlDecodeProvider,
    IdlStandard,
    type InstructionDecode,
    type InstructionDecodeFor,
    type InstructionHandlers,
    type LegacyDecoderOptions,
    type SupportedIdl,
} from './types';

export type IdlClientOptions = LegacyDecoderOptions & {
    /** Decode engine — defaults to the codama provider; pass a heavier one (anchor) only when needed. */
    provider?: IdlDecodeProvider;
};

/**
 * Parsed-data client over one IDL. Decode results narrow statically to the IDL's standard;
 * handler-map overloads let consumers declare outcomes instead of branching; `getDecodedData`
 * payload types derive from the IDL type (literal documents infer, wide runtime documents degrade
 * to `unknown` — declare the shape per call in that case).
 */
export type IdlClient<T extends SupportedIdl = SupportedIdl> = {
    readonly idl: T;
    programAddress(): string | undefined;
    programName(): string | undefined;
    instructionName(data: Uint8Array): string | undefined;
    decodeInstruction: {
        (ix: Instruction): InstructionDecodeFor<T>;
        <R>(ix: Instruction, handlers: InstructionHandlers<T, R>): R;
    };
    decodeAccount: {
        (data: Uint8Array): AccountDecodeFor<T>;
        <R>(data: Uint8Array, handlers: AccountHandlers<T, R>): R;
    };
    /** Decoded payload typed from the IDL; `undefined` only for the unknown arm — narrowing `decode.kind` first drops it. */
    getDecodedData: {
        <TData = InstructionDataOf<T>>(decode: Extract<InstructionDecode, { kind: IdlStandard }>): TData;
        <TData = AccountDataOf<T>>(decode: Extract<AccountDecode, { kind: IdlStandard }>): TData;
        <TData = InstructionDataOf<T>>(decode: InstructionDecode): TData | undefined;
        <TData = AccountDataOf<T>>(decode: AccountDecode): TData | undefined;
    };
};

/** Client for a known-supported IDL; throws on a value that fails runtime detection (lying type) — use `tryCreateIdlClient` for untrusted input. */
export function createIdlClient<T extends SupportedIdl>(idl: T, options: IdlClientOptions = {}): IdlClient<T> {
    if (!isSupportedIdl(idl)) throw unsupportedIdl();

    const { provider = codamaProvider(), ...legacyOptions } = options;
    const table = buildInstructionNameTable(idl);

    function decodeInstruction(ix: Instruction): InstructionDecodeFor<T>;
    function decodeInstruction<R>(ix: Instruction, handlers: InstructionHandlers<T, R>): R;
    function decodeInstruction<R>(ix: Instruction, handlers?: InstructionHandlers<T, R>) {
        const decode = provider.decodeInstruction(idl, ix, legacyOptions);
        if (!handlers) return decode;
        return dispatch(decode, handlers);
    }

    function decodeAccount(data: Uint8Array): AccountDecodeFor<T>;
    function decodeAccount<R>(data: Uint8Array, handlers: AccountHandlers<T, R>): R;
    function decodeAccount<R>(data: Uint8Array, handlers?: AccountHandlers<T, R>) {
        const decode = provider.decodeAccount(idl, data);
        if (!handlers) return decode;
        return dispatch(decode, handlers);
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
        decodeAccount,
        decodeInstruction,
        getDecodedData,
        idl,
        instructionName: data => matchInstructionName(table, data),
        programAddress: () => getIdlProgramAddress(idl),
        programName: () => buildProgramName(idl),
    };
}

/** Detect and wrap untrusted input — error-first result instead of a throw. */
export function tryCreateIdlClient(
    idl: unknown,
    options: IdlClientOptions = {},
): Result<IdlClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT> {
    if (!isSupportedIdl(idl)) return err(unsupportedIdl());
    return ok(createIdlClient(idl, options));
}

export function isAnchorStandard(client: IdlClient): client is IdlClient<AnchorIdl> {
    return isAnchorIdl(client.idl);
}

export function isCodamaStandard(client: IdlClient): client is IdlClient<CodamaIdl> {
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
