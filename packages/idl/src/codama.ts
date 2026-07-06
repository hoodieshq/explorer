// The codama decode engine — the DEFAULT provider (used unless an Anchor provider is specified).
// Lives behind its own entry ('@explorer/idl/codama') so heavier engines can follow the same pattern.
import { decodeAccountWithIdl } from './decode-account';
import { decodeInstructionWithIdl } from './decode-instruction';
import type { IdlDecodeProvider } from './types';

export { convertToCodama } from './convert';
export { decodeAccountWithIdl } from './decode-account';
export { decodeInstructionWithIdl } from './decode-instruction';

/** The codama-engine decode provider — decodes both standards against the client's IDL. */
export function codamaProvider(): IdlDecodeProvider {
    return {
        decodeAccount: (idl, data) => decodeAccountWithIdl(idl, data),
        decodeInstruction: (idl, ix, options) => decodeInstructionWithIdl(idl, ix, options),
    };
}
