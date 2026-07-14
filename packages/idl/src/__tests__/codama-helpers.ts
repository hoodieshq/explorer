// Codama drivers for the functional sweeps — codama's OWN tooling sits on the encode side, so the
// engine under test only ever sees what real consumers produce.
import { createProgramClient, type ProgramClient } from '@codama/dynamic-client';
import type { Instruction } from '@solana/kit';

import type { CodamaIdl, CodamaIdlInput } from '../types';

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the inputs are known codama roots (detection is re-proven per test); the Instruction cast bridges codama tooling with the client */
export const DEFAULT_ADDRESS = '11111111111111111111111111111111';

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
