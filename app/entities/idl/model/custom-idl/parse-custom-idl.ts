import { array, is, literal, optional, string, type } from 'superstruct';

import { type SupportedIdl } from '../../lib/types';

export type CustomIdlParseResult = { ok: true; idl: SupportedIdl } | { ok: false; error: string };

/**
 * Validate user-supplied IDL JSON for `programAddress`. Shared by the upload dialog and the storage reader,
 * since `localStorage` is editable by hand and must pass the same check as a fresh upload.
 */
export function parseCustomIdl(text: string, programAddress: string): CustomIdlParseResult {
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        return { error: 'The file is not valid JSON.', ok: false };
    }
    return validateCustomIdl(json, programAddress);
}

/** The program address an IDL's JSON declares, for adding an IDL without picking the program first. */
export function parseDeclaredProgramAddress(text: string): string | undefined {
    try {
        return declaredProgramAddress(JSON.parse(text));
    } catch {
        return undefined;
    }
}

export function validateCustomIdl(json: unknown, programAddress: string): CustomIdlParseResult {
    if (!is(json, CodamaRootShape) && !is(json, AnchorIdlShape)) {
        return { error: 'This JSON is not an Anchor or Codama IDL.', ok: false };
    }
    const declared = declaredProgramAddress(json);
    if (declared && declared !== programAddress) {
        return { error: `This IDL is for program ${declared}, not ${programAddress}.`, ok: false };
    }
    return { idl: json as SupportedIdl, ok: true };
}

// Only the fields the Explorer routes on: `kind` and `standard` pick the Codama decoder and display,
// `instructions` the Anchor ones, and the address fields guard against an IDL meant for another program.
// The decoders validate the rest.
const CodamaRootShape = type({
    kind: literal('rootNode'),
    program: type({ publicKey: string() }),
    standard: literal('codama'),
});
const AnchorIdlShape = type({
    address: optional(string()),
    instructions: array(),
    metadata: optional(type({ address: optional(string()) })),
});

// Codama roots carry the program at `program.publicKey`; modern Anchor IDLs at `address`, legacy ones at
// `metadata.address` (often absent).
function declaredProgramAddress(idl: unknown): string | undefined {
    if (is(idl, CodamaRootShape)) return idl.program.publicKey;
    if (is(idl, AnchorIdlShape)) return idl.address ?? idl.metadata?.address;
    return undefined;
}
