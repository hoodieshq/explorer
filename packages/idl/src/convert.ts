/* eslint-disable @typescript-eslint/consistent-type-assertions -- nodes-from-anchor ships its own (narrower) Anchor IDL + RootNode types; the cast sits behind the isCodamaIdl guard */
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';

import { isCodamaIdl } from './detect';
import { err, IDL_ERROR__IDL_PARSE_FAILED, IdlError, ok, type Result } from './errors';
import type { CodamaIdl, SupportedIdl } from './types';

/**
 * The recommended conversion into the Codama model: Codama roots pass through unchanged, Anchor
 * documents normalize via nodes-from-anchor. Error-first result — conversion fails for documents
 * the converter does not understand (route those to an injected legacy decoder).
 */
export function convertToCodama(idl: SupportedIdl): Result<CodamaIdl, typeof IDL_ERROR__IDL_PARSE_FAILED> {
    if (isCodamaIdl(idl)) return ok(idl);
    try {
        return ok(rootNodeFromAnchor(idl as Parameters<typeof rootNodeFromAnchor>[0]) as unknown as CodamaIdl);
    } catch (cause) {
        return err(new IdlError(IDL_ERROR__IDL_PARSE_FAILED, { cause, operation: 'rootNodeFromAnchor' }));
    }
}
