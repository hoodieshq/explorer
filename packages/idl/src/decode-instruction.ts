/* eslint-disable @typescript-eslint/consistent-type-assertions -- every cast sits behind a runtime IDL guard TS cannot relate to the unresolved conditional return type */
import { parseInstruction } from '@codama/dynamic-parsers';
import type { Instruction } from '@solana/kit';

import type { IdlClientOptions } from './client';
import { convertToCodama } from './convert';
import { getIdlProgramAddress, isAnchorIdl } from './detect';
import { IDL_ERROR__IDL_ADDRESS_MISMATCH, IDL_ERROR__IDL_PARSE_FAILED, IdlError } from './errors';
import { IdlStandard, type InstructionDecodeFor, type SupportedIdl } from './types';

// Single Codama pipeline (Anchor IDLs convert via nodes-from-anchor); the anchor arm only comes from the injected legacy decoder until the Anchor-rich path lands (mcp-endpoint Step 6).
export function decodeInstructionWithIdl<T extends SupportedIdl>(
    idl: T,
    ix: Instruction,
    options: IdlClientOptions = {},
): InstructionDecodeFor<T> {
    // A declared-program mismatch is a wiring bug — fail loud rather than mis-decode against the wrong interface.
    const declaredAddress = getIdlProgramAddress(idl);
    if (declaredAddress && declaredAddress !== ix.programAddress) {
        throw new IdlError(IDL_ERROR__IDL_ADDRESS_MISMATCH, {
            declaredAddress,
            programAddress: ix.programAddress,
        });
    }

    const errors: IdlError[] = [];
    const [convertError, root] = convertToCodama(idl);
    if (convertError) errors.push(convertError);
    if (root) {
        try {
            const parsed = parseInstruction(root, {
                accounts: ix.accounts ?? [],
                data: ix.data ?? new Uint8Array(),
                programAddress: ix.programAddress,
            });
            // a miss (no discriminator match) is a plain miss, not an error
            if (parsed) return { decoded: parsed, kind: IdlStandard.Codama } as InstructionDecodeFor<T>;
        } catch (cause) {
            errors.push(new IdlError(IDL_ERROR__IDL_PARSE_FAILED, { cause, operation: 'parseInstruction' }));
        }
    }

    // escape hatch for Anchor IDLs the conversion route cannot handle — injected, never bundled
    if (isAnchorIdl(idl) && options.legacyAnchorDecoder) {
        const decoded = options.legacyAnchorDecoder(idl, ix);
        if (decoded !== undefined) return { decoded, kind: IdlStandard.Anchor } as InstructionDecodeFor<T>;
    }

    return { errors, kind: 'unknown' } as InstructionDecodeFor<T>;
}
