/* eslint-disable @typescript-eslint/consistent-type-assertions -- every cast sits behind a runtime IDL guard TS cannot relate to the unresolved conditional return type */
import { parseAccountData } from '@codama/dynamic-parsers';

import { convertToCodama } from '../anchor/convert.js';
import { getIdlStandard, isCodamaIdl } from '../detect.js';
import { IDL_ERROR__ACCOUNT_DECODE_FAILED, IdlError, ok } from '../errors.js';
import { type AccountDecodeFor, type AnchorIdl, type CodamaIdl, IdlStandard, type SupportedIdl } from '../types.js';

// Same Codama pipeline as the instruction decode — account struct layouts travel with the nodes-from-anchor conversion.
export function decodeAccountWithIdl<T extends SupportedIdl>(idl: T, data: Uint8Array): AccountDecodeFor<T> {
    const errors: IdlError[] = [];
    const [convertError, root] = isCodamaIdl(idl) ? ok<CodamaIdl>(idl) : convertToCodama(idl as AnchorIdl);
    if (convertError) errors.push(convertError);
    if (root) {
        try {
            const parsed = parseAccountData(root, data);
            // a miss (no discriminator match) is a plain miss, not an error
            if (parsed) return { decoded: parsed, kind: IdlStandard.Codama } as AccountDecodeFor<T>;
        } catch (cause) {
            errors.push(
                new IdlError(IDL_ERROR__ACCOUNT_DECODE_FAILED, {
                    cause,
                    dataLength: data.length,
                    standard: getIdlStandard(idl),
                }),
            );
        }
    }
    return { errors, kind: 'unknown' } as AccountDecodeFor<T>;
}
