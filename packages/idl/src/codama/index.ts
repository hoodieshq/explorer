// The codama decode engine ('@explorer/idl/codama') — behind its own entry so processes that never
// decode (name-only MCP tools) never load it; the main entry stays engine-free.
import { createIdlClient, type IdlClient, tryCreateIdlClient } from '../client';
import type { IDL_ERROR__UNSUPPORTED_IDL_FORMAT, Result } from '../errors';
import type { IdlDecodeProvider, LegacyDecoderOptions, SupportedIdlInput } from '../types';

import { decodeAccountWithIdl } from './decode-account';
import { decodeInstructionWithIdl } from './decode-instruction';

export { decodeAccountWithIdl } from './decode-account';
export { decodeInstructionWithIdl } from './decode-instruction';

/** The codama-engine decode provider — decodes both standards via the codama pipeline. */
export function codamaProvider(): IdlDecodeProvider {
    return {
        decodeAccount: (idl, data) => decodeAccountWithIdl(idl, data),
        decodeInstruction: (idl, ix, options) => decodeInstructionWithIdl(idl, ix, options),
    };
}

/** `createIdlClient` pre-wired with the codama provider — the one-import path for default-engine users. */
export function createCodamaIdlClient<T extends SupportedIdlInput>(
    idl: T,
    options: LegacyDecoderOptions = {},
): IdlClient<T> {
    return createIdlClient(idl, { ...options, provider: codamaProvider() });
}

/** `tryCreateIdlClient` pre-wired with the codama provider — error-first for untrusted input. */
export function tryCreateCodamaIdlClient(
    idl: unknown,
    options: LegacyDecoderOptions = {},
): Result<IdlClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT> {
    return tryCreateIdlClient(idl, { ...options, provider: codamaProvider() });
}
