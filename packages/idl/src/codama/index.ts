// The codama decode engine ('@explorer/idl/codama') — behind its own entry so processes that never
// decode (name-only MCP tools) never load it; the main entry stays engine-free.
import { createIdlClient, type IdlClient, tryCreateIdlClient } from '../client.js';
import type { IDL_ERROR__UNSUPPORTED_IDL_FORMAT, Result } from '../errors.js';
import type { FallbackDecoderOptions, IdlDecodeProvider, SupportedIdlInput } from '../types.js';

import { decodeAccountWithIdl } from './decode-account.js';
import { decodeInstructionWithIdl } from './decode-instruction.js';

export { decodeAccountWithIdl } from './decode-account.js';
export { decodeInstructionWithIdl } from './decode-instruction.js';

/** The codama-engine decode provider — decodes both standards via the codama pipeline. */
export function codamaProvider(): IdlDecodeProvider {
    return {
        decodeAccount: (idl, data, options) => decodeAccountWithIdl(idl, data, options),
        decodeInstruction: (idl, ix, options) => decodeInstructionWithIdl(idl, ix, options),
    };
}

/** `createIdlClient` pre-wired with the codama provider — the one-import path for default-engine users. */
export function createCodamaIdlClient<T extends SupportedIdlInput>(
    idl: T,
    options: FallbackDecoderOptions = {},
): IdlClient<T> {
    return createIdlClient(idl, { ...options, provider: codamaProvider() });
}

/** `tryCreateIdlClient` pre-wired with the codama provider — error-first for untrusted input. */
export function tryCreateCodamaIdlClient(
    idl: unknown,
    options: FallbackDecoderOptions = {},
): Result<IdlClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT> {
    return tryCreateIdlClient(idl, { ...options, provider: codamaProvider() });
}
