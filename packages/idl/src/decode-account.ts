/* eslint-disable @typescript-eslint/consistent-type-assertions -- every cast sits behind a runtime IDL guard TS cannot relate to the unresolved conditional return type */
import { parseAccountData } from '@codama/dynamic-parsers';

import { convertToCodama } from './convert';
import { getIdlStandard } from './detect';
import { IDL_ERROR__ACCOUNT_DECODE_FAILED, IdlError } from './errors';
import { type AccountDecodeFor, IdlStandard, type SupportedIdl } from './types';

// Same Codama pipeline as the instruction decode — account struct layouts travel with the nodes-from-anchor conversion.
export function decodeAccountWithIdl<T extends SupportedIdl>(idl: T, data: Uint8Array): AccountDecodeFor<T> {
    const errors: IdlError[] = [];
    const [convertError, root] = convertToCodama(idl);
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
