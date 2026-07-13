// Shared Codama drivers for the __tests__ suites — codama's OWN tooling sits on the encode side, so
// the package under test only ever sees what real consumers produce.
import { createProgramClient, type ProgramClient } from '@codama/dynamic-client';
import { getNodeCodec } from '@codama/dynamic-codecs';
import type { CodamaIdl, CodamaIdlInput } from '@explorer/idl';
import type { Instruction } from '@solana/kit';

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the inputs are known codama roots (detection is re-proven per test); NodePath/Instruction casts bridge codama tooling with the client */
export const DEFAULT_ADDRESS = '11111111111111111111111111111111';

// dynamic-codecs represents bytesTypeNode values as [encoding, data] tuples; the parsers READ them
// back as base64 regardless of what encoding fed the encoder.
export const base16 = (hex: string): [string, string] => ['base16', hex];
export const base64 = (data: string): [string, string] => ['base64', data];

/** The PMP-fetch acquisition route for codama roots: plain untrusted JSON, no anchor client involved. */
export function fetchedJson(idl: CodamaIdlInput): unknown {
    return JSON.parse(JSON.stringify(idl));
}

/** Build the named zero-argument instruction with codama's OWN dynamic client (every account defaulted). */
export async function buildInstruction(idl: CodamaIdlInput, name: string): Promise<Instruction> {
    const root = idl as unknown as CodamaIdl;
    const node = root.program.instructions.find(item => item.name === name);
    if (!node) throw new Error(`${name} must be declared by the IDL`);
    const accounts = Object.fromEntries(node.accounts.map(item => [item.name, DEFAULT_ADDRESS]));
    const built = await createProgramClient<ProgramClient>(root).methods[name]().accounts(accounts).instruction();
    return built as Instruction;
}

/** Encode the named account's full field values (incl. discriminator defaults) with codama's OWN codec. */
export function encodeAccount(idl: CodamaIdlInput, name: string, data: object): Uint8Array {
    const root = idl as unknown as CodamaIdl;
    const node = root.program.accounts.find(item => item.name === name);
    if (!node) throw new Error(`${name} must be declared by the IDL`);
    const codec = getNodeCodec([root, root.program, node] as Parameters<typeof getNodeCodec>[0]);
    return Uint8Array.from(codec.encode(data));
}
