import { Idl } from '@coral-xyz/anchor';

import type { IdlSpec, LegacyIdl } from '../converters/convert-legacy-idl';
import {
    convertLegacyIdl as convertDisplayIdl,
    getIdlSpecKeyType,
    getIdlSpecType,
    removeUnusedTypes,
} from '../converters/convert-legacy-idl';
import type { IdlFormatter } from '../types';

export type IdlSpecKey = IdlSpec | 'legacy-shank';

/// Write a layer to register current formatters as well as to a add new one
const formattersRegistry = new Map<IdlSpecKey, IdlFormatter>();

/**
 * Register a formatter
 */
function registerFormatter<T extends IdlFormatter>(key: IdlSpecKey, fn: T) {
    formattersRegistry.set(key, fn);
}

registerFormatter('0.1.0', idl => idl as Idl);

registerFormatter('legacy', (idl, programAddress) => {
    return removeUnusedTypes(convertDisplayIdl(idl as LegacyIdl, programAddress));
});

registerFormatter('legacy-shank', (idl, programAddress) => {
    return removeUnusedTypes(convertDisplayIdl(idl as LegacyIdl, programAddress));
});

/**
 * Format IDL to display it in a human-readable way acording its type
 *
 * @param idl
 * @param programAddress
 * @returns
 */
export const formatDisplayIdl: IdlFormatter = (idl: unknown, programAddress?: string) => {
    const baseSpec = getIdlSpecType(idl);
    const spec = getIdlSpecKeyType(idl);

    // get a spec formatter and make a fallback to the base one
    const formatter = formattersRegistry.get(spec) ?? formattersRegistry.get(baseSpec);

    if (!formatter) {
        throw new Error(`IDL spec not supported: ${spec}`);
    }

    return formatter(idl, programAddress);
};
