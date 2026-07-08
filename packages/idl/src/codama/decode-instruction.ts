/* eslint-disable @typescript-eslint/consistent-type-assertions -- every cast sits behind a runtime IDL guard TS cannot relate to the unresolved conditional return type */
import { parseInstruction } from '@codama/dynamic-parsers';
import type { Instruction } from '@solana/kit';

import { convertToCodama } from '../anchor/convert.js';
import { getIdlProgramAddress, getIdlStandard, isAnchorIdl, isCodamaIdl } from '../detect.js';
import { IDL_ERROR__IDL_ADDRESS_MISMATCH, IDL_ERROR__INSTRUCTION_DECODE_FAILED, IdlError, ok } from '../errors.js';
import {
    type AnchorIdl,
    type CodamaIdl,
    IdlStandard,
    type InstructionDecode,
    type InstructionDecodeFor,
    type LegacyDecoderOptions,
    type SupportedIdl,
} from '../types.js';

// Single Codama pipeline (Anchor IDLs convert via nodes-from-anchor); the anchor arm only comes from the injected legacy decoder until the Anchor-rich path lands (mcp-endpoint Step 6).
export function decodeInstructionWithIdl<T extends CodamaIdl>(
    idl: T,
    ix: Instruction,
    options?: LegacyDecoderOptions,
): InstructionDecodeFor<T>;
export function decodeInstructionWithIdl<T extends AnchorIdl>(
    idl: T,
    ix: Instruction,
    options?: LegacyDecoderOptions,
): InstructionDecodeFor<T>;
export function decodeInstructionWithIdl(
    idl: SupportedIdl,
    ix: Instruction,
    options?: LegacyDecoderOptions,
): InstructionDecode;
export function decodeInstructionWithIdl(
    idl: SupportedIdl,
    ix: Instruction,
    options: LegacyDecoderOptions = {},
): InstructionDecode {
    // A declared-program mismatch is a wiring bug — fail loud rather than mis-decode against the wrong interface.
    const declaredAddress = getIdlProgramAddress(idl);
    if (declaredAddress && declaredAddress !== ix.programAddress) {
        throw new IdlError(IDL_ERROR__IDL_ADDRESS_MISMATCH, {
            declaredAddress,
            programAddress: ix.programAddress,
        });
    }

    const errors: IdlError[] = [];
    const [convertError, root] = isCodamaIdl(idl) ? ok<CodamaIdl>(idl) : convertToCodama(idl as AnchorIdl);
    if (convertError) errors.push(convertError);
    if (root) {
        try {
            const parsed = parseInstruction(root, {
                accounts: ix.accounts ?? [],
                data: ix.data ?? new Uint8Array(),
                programAddress: ix.programAddress,
            });
            // a miss (no discriminator match) is a plain miss, not an error
            if (parsed) return { decoded: parsed, kind: IdlStandard.Codama };
        } catch (cause) {
            // the document already converted — this is a decode failure, not a document-parse failure
            errors.push(
                new IdlError(IDL_ERROR__INSTRUCTION_DECODE_FAILED, {
                    cause,
                    programAddress: ix.programAddress,
                    standard: getIdlStandard(idl),
                }),
            );
        }
    }

    // escape hatch for Anchor IDLs the conversion route cannot handle — injected, never bundled
    if (isAnchorIdl(idl) && options.legacyAnchorDecoder) {
        try {
            const decoded = options.legacyAnchorDecoder(idl, ix);
            if (decoded !== undefined) {
                // keep the bypassed pipeline errors observable — a rescue must not hide a broken conversion
                return errors.length
                    ? { decoded, kind: IdlStandard.Anchor, recoveredFrom: errors }
                    : { decoded, kind: IdlStandard.Anchor };
            }
        } catch (cause) {
            // a throwing injected decoder must not escape the errors-as-values contract — fold it into the unknown arm
            errors.push(
                new IdlError(IDL_ERROR__INSTRUCTION_DECODE_FAILED, {
                    cause,
                    programAddress: ix.programAddress,
                    standard: getIdlStandard(idl),
                }),
            );
        }
    }

    return { errors, kind: 'unknown' };
}
