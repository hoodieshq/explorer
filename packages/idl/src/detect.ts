import {
    type AnchorIdl,
    type CodamaIdl,
    IdlStandard,
    type IdlVersion,
    type LegacyAnchorIdl,
    MODERN_ANCHOR_IDL_WILDCARD,
    type SupportedIdl,
} from './types';

export { MODERN_ANCHOR_IDL_WILDCARD };

/** Modern Anchor (>= 0.30) declares `metadata.spec`; legacy Anchor has none and is not supported here. */
export function isAnchorIdl(value: unknown): value is AnchorIdl {
    if (typeof value !== 'object' || value === null) return false;
    if (!('metadata' in value) || !('instructions' in value)) return false;
    const { instructions, metadata } = value;
    return (
        typeof metadata === 'object' &&
        metadata !== null &&
        'spec' in metadata &&
        typeof metadata.spec === 'string' &&
        Array.isArray(instructions)
    );
}

/** A Codama IDL is a `RootNode`. */
export function isCodamaIdl(value: unknown): value is CodamaIdl {
    if (typeof value !== 'object' || value === null) return false;
    return (
        'kind' in value &&
        value.kind === 'rootNode' &&
        'program' in value &&
        typeof value.program === 'object' &&
        value.program !== null
    );
}

export function isSupportedIdl(value: unknown): value is SupportedIdl {
    return isCodamaIdl(value) || isAnchorIdl(value);
}

/** A pre-0.30 Anchor IDL — recognized only so consumers can route it to a custom decoder; the client rejects it. */
export function isLegacyAnchorIdl(value: unknown): value is LegacyAnchorIdl {
    if (isSupportedIdl(value)) return false;
    if (typeof value !== 'object' || value === null) return false;
    if (!('name' in value) || !('version' in value) || !('instructions' in value)) return false;
    return typeof value.name === 'string' && typeof value.version === 'string' && Array.isArray(value.instructions);
}

export function getIdlStandard(idl: SupportedIdl): IdlStandard {
    return isCodamaIdl(idl) ? IdlStandard.Codama : IdlStandard.Anchor;
}

// Codama root nodes carry the program id at `program.publicKey`; modern Anchor IDLs at the top-level `address`.
export function getIdlProgramAddress(idl: SupportedIdl): string | undefined {
    return (isCodamaIdl(idl) ? idl.program?.publicKey : idl.address) || undefined;
}

/** Standard-era label: the Codama root format version, or the modern-Anchor wildcard. */
export function getIdlVersion(idl: SupportedIdl): IdlVersion {
    return isCodamaIdl(idl) ? idl.version : MODERN_ANCHOR_IDL_WILDCARD;
}

/** The IDL format (encoding) version — Codama's root `version` or Anchor's `metadata.spec`. */
export function getIdlFormatVersion(idl: SupportedIdl): string {
    return isCodamaIdl(idl) ? idl.version : idl.metadata.spec;
}

/** The program's own semver, when the IDL carries one — distinct from the format version. */
export function getIdlProgramVersion(idl: SupportedIdl): string | undefined {
    // `|| undefined` guards runtime IDLs that lie about the fields the types declare as required.
    return (isCodamaIdl(idl) ? idl.program.version : idl.metadata?.version) || undefined;
}
