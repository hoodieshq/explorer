import type { Instruction } from '@solana/kit';

import { decodeAccountWithIdl } from './decode-account';
import { decodeInstructionWithIdl } from './decode-instruction';
import { getIdlProgramAddress, isAnchorIdl, isCodamaIdl, isSupportedIdl } from './detect';
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
    type AnchorDecodedInstruction,
    type AnchorIdl,
    type CodamaIdl,
    IdlStandard,
    type InstructionDecode,
    type InstructionDecodeFor,
    type InstructionHandlers,
    type SupportedIdl,
} from './types';

export type IdlClientOptions = {
    /** Borsh fallback for legacy Anchor IDLs `@codama/nodes-from-anchor` cannot convert — always injected, never bundled. */
    legacyAnchorDecoder?: (idl: AnchorIdl, ix: Instruction) => AnchorDecodedInstruction | undefined;
};

/** Parsed-data client over one IDL; handler-map overloads let consumers declare outcomes instead of branching, and results narrow statically to the IDL's standard. */
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
};

/** Client for a known-supported IDL; throws on a value that fails runtime detection (lying type) — use `tryCreateIdlClient` for untrusted input. */
export function createIdlClient<T extends SupportedIdl>(idl: T, options: IdlClientOptions = {}): IdlClient<T> {
    if (!isSupportedIdl(idl)) throw unsupportedIdl();

    const table = buildInstructionNameTable(idl);

    function decodeInstruction(ix: Instruction): InstructionDecodeFor<T>;
    function decodeInstruction<R>(ix: Instruction, handlers: InstructionHandlers<T, R>): R;
    function decodeInstruction<R>(ix: Instruction, handlers?: InstructionHandlers<T, R>) {
        const decode = decodeInstructionWithIdl(idl, ix, options);
        if (!handlers) return decode;
        return dispatch(decode, handlers);
    }

    function decodeAccount(data: Uint8Array): AccountDecodeFor<T>;
    function decodeAccount<R>(data: Uint8Array, handlers: AccountHandlers<T, R>): R;
    function decodeAccount<R>(data: Uint8Array, handlers?: AccountHandlers<T, R>) {
        const decode = decodeAccountWithIdl(idl, data);
        if (!handlers) return decode;
        return dispatch(decode, handlers);
    }

    return {
        decodeAccount,
        decodeInstruction,
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

/**
 * The decoded payload regardless of which arm produced it — the generic way to receive instruction
 * or account data without knowing the standard's internal shape. `undefined` for the unknown arm.
 */
export function getDecodedData(decode: AccountDecode | InstructionDecode): unknown {
    if (decode.kind === IdlStandard.Codama) return decode.decoded.data;
    if (decode.kind === IdlStandard.Anchor) return decode.decoded;
    return undefined;
}

function unsupportedIdl(): IdlError<typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT> {
    return new IdlError(IDL_ERROR__UNSUPPORTED_IDL_FORMAT);
}

// Runtime-only widening — the public overloads enforce totality, so a miss here means the caller bypassed the types.
type AnyDecode = AccountDecode | InstructionDecode;
type AnyHandlers<R> = {
    anchor?: (decode: Extract<AnyDecode, { kind: IdlStandard.Anchor }>) => R;
    codama?: (decode: Extract<AnyDecode, { kind: IdlStandard.Codama }>) => R;
    unknown?: (decode: Extract<AnyDecode, { kind: 'unknown' }>) => R;
};

function dispatch<R>(decode: AnyDecode, handlers: object): R {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- an instruction dispatch only ever receives instruction handlers (and accounts likewise); TS cannot correlate the pairs across the widened union
    const map = handlers as AnyHandlers<R>;
    if (decode.kind === IdlStandard.Anchor && map.anchor) return map.anchor(decode);
    if (decode.kind === IdlStandard.Codama && map.codama) return map.codama(decode);
    if (decode.kind === 'unknown' && map.unknown) return map.unknown(decode);
    throw new IdlError(IDL_ERROR__MISSING_DECODE_HANDLER, { kind: decode.kind });
}
