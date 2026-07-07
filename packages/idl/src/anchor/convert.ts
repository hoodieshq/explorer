/* eslint-disable @typescript-eslint/consistent-type-assertions -- nodes-from-anchor ships its own (narrower) Anchor IDL + RootNode types */
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';

import { err, IDL_ERROR__IDL_PARSE_FAILED, IdlError, ok, type Result } from '../errors';
import type { AnchorIdl, CodamaIdl } from '../types';

/**
 * The recommended conversion of a modern Anchor document into the Codama model (nodes-from-anchor).
 * Error-first result — conversion fails for documents the converter does not understand (route those
 * to an injected legacy decoder).
 */
export function convertToCodama(idl: AnchorIdl): Result<CodamaIdl, typeof IDL_ERROR__IDL_PARSE_FAILED> {
    try {
        return ok(rootNodeFromAnchor(idl as Parameters<typeof rootNodeFromAnchor>[0]) as unknown as CodamaIdl);
    } catch (cause) {
        return err(new IdlError(IDL_ERROR__IDL_PARSE_FAILED, { cause, operation: 'rootNodeFromAnchor' }));
    }
}
