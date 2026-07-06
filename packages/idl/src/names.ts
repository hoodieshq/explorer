import {
    type Encoder,
    getI8Encoder,
    getI16Encoder,
    getI32Encoder,
    getU8Encoder,
    getU16Encoder,
    getU32Encoder,
} from '@solana/kit';
import { type InstructionNode, isNode, titleCase } from 'codama';

import { isCodamaIdl } from './detect';
import { type AnchorIdl, type CodamaIdl, type SupportedIdl } from './types';

export type InstructionNameEntry = {
    discriminator: Uint8Array;
    name: string;
};

// Names only — no arg/account schema — so resolution is a byte-prefix compare, never a Borsh decode.
export type InstructionNameTable = readonly InstructionNameEntry[];

export type InstructionNameResolver = (data: Uint8Array) => string | undefined;

/** The program's display name from IDL metadata, title-cased; undefined when the IDL does not name it. */
export function buildProgramName(idl: SupportedIdl): string | undefined {
    const name = isCodamaIdl(idl) ? idl.program?.name : idl.metadata?.name;
    return name ? titleCase(name) : undefined;
}

/** Build a name resolver from the IDL's discriminator table; undefined when no usable table. */
export function buildInstructionNameResolver(idl: SupportedIdl): InstructionNameResolver | undefined {
    const table = buildInstructionNameTable(idl);
    if (table.length === 0) return undefined;
    return data => matchInstructionName(table, data);
}

export function buildInstructionNameTable(idl: SupportedIdl): InstructionNameTable {
    return isCodamaIdl(idl) ? buildCodamaTable(idl) : buildAnchorTable(idl);
}

// Longest-prefix match (1-byte Codama must not shadow 8-byte Anchor); empty discriminators would match everything, so they are skipped.
export function matchInstructionName(table: InstructionNameTable, data: Uint8Array): string | undefined {
    let match: InstructionNameEntry | undefined;
    for (const entry of table) {
        if (
            entry.discriminator.length > 0 &&
            startsWith(data, entry.discriminator) &&
            (!match || entry.discriminator.length > match.discriminator.length)
        ) {
            match = entry;
        }
    }
    return match?.name;
}

function startsWith(data: Uint8Array, prefix: Uint8Array): boolean {
    if (prefix.length > data.length) return false;
    for (let i = 0; i < prefix.length; i++) {
        if (data[i] !== prefix[i]) return false;
    }
    return true;
}

// Anchor: discriminators are explicit byte arrays.
function buildAnchorTable(idl: AnchorIdl): InstructionNameEntry[] {
    return (idl.instructions ?? []).flatMap(ix =>
        ix.discriminator?.length
            ? [{ discriminator: Uint8Array.from(ix.discriminator), name: titleCase(ix.name) }]
            : [],
    );
}

// kit encoders carry their own width + endianness, so there's no format→size lookup to keep in sync.
const DISCRIMINATOR_ENCODERS: Record<string, Encoder<bigint | number>> = {
    i16: getI16Encoder(),
    i32: getI32Encoder(),
    i8: getI8Encoder(),
    u16: getU16Encoder(),
    u32: getU32Encoder(),
    u8: getU8Encoder(),
};

function buildCodamaTable(idl: CodamaIdl): InstructionNameEntry[] {
    return (idl.program?.instructions ?? []).flatMap(ix => {
        const discriminator = codamaDiscriminator(ix);
        return discriminator ? [{ discriminator, name: titleCase(ix.name) }] : [];
    });
}

// Only the common PMP case — one constant int field discriminator at offset 0; Anchor byte arrays go through the Anchor table.
function codamaDiscriminator(ix: InstructionNode): Uint8Array | undefined {
    const [field, ...rest] = ix.discriminators ?? [];
    if (!field || rest.length > 0 || !isNode(field, 'fieldDiscriminatorNode') || field.offset !== 0) {
        return undefined;
    }
    const arg = ix.arguments.find(item => item.name === field.name);
    if (!arg || !isNode(arg.type, 'numberTypeNode') || !isNode(arg.defaultValue, 'numberValueNode')) {
        return undefined;
    }
    const bytes = DISCRIMINATOR_ENCODERS[arg.type.format]?.encode(arg.defaultValue.number);
    return bytes && Uint8Array.from(bytes);
}
