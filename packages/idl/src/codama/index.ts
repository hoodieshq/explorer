// The codama decode engine — the DEFAULT provider (used unless an Anchor provider is specified).
import type { IdlDecodeProvider } from '../types';

import { decodeAccountWithIdl } from './decode-account';
import { decodeInstructionWithIdl } from './decode-instruction';

/** The codama-engine decode provider — decodes both standards against the client's IDL. */
export function codamaProvider(): IdlDecodeProvider {
    return {
        decodeAccount: (idl, data) => decodeAccountWithIdl(idl, data),
        decodeInstruction: (idl, ix, options) => decodeInstructionWithIdl(idl, ix, options),
    };
}
