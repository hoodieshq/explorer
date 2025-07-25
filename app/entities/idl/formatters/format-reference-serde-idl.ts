import { formatIdl } from '../converters/convert-reference-legacy-idl';

/**
 * @ deprecated
 * Reference implementation for convertLegacyIdl. Keep it to be aware of its limitations
 *
 * @param idl
 * @param programAddress
 * @returns
 */
export function formatReferenceSerdeIdl(idl: NonNullable<object>, programAddress: string) {
    return formatIdl(idl, programAddress);
}
