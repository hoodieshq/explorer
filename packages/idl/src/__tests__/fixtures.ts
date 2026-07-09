import { address, type Instruction } from '@solana/kit';

import type { AnchorIdl, CodamaIdl, LegacyAnchorIdl } from '../types';

export { loadLetMeBuyIdl, loadLetMeBuyPmpIdl } from './generated/let-me-buy';
// companion types are committed snapshots of the anchor build output (see ./generated/*.types.ts)
export { type Simple } from './generated/simple.types';
export { type Simple031 } from './generated/simple-031.types';
export { loadSimple031Idl, loadSimple031IdlTyped } from './generated/simple-031';
export { loadSimpleIdl, loadSimpleIdlTyped } from './generated/simple';
export { loadTokenkegIdl } from './generated/tokenkeg';

export const u64le = (value: bigint): number[] => {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, value, true);
    return Array.from(bytes);
};

/** `increment(amount: 42)` built from the program's own declared discriminator, as a kit instruction. */
export const incrementIx = (idl: AnchorIdl): Instruction & { accounts: []; data: Uint8Array } => {
    const increment = idl.instructions.find(item => item.name === 'increment');
    if (!increment) throw new Error('program must declare increment');
    return {
        accounts: [],
        data: new Uint8Array([...increment.discriminator, ...u64le(42n)]),
        programAddress: address(idl.address),
    };
};

/** `transfer(amount: 42)` built from a Codama root's declared constant u8 field discriminator (SPL Token shape). */
export const transferIx = (idl: CodamaIdl): Instruction & { accounts: []; data: Uint8Array } => {
    const transfer = idl.program.instructions.find(item => item.name === 'transfer');
    const discriminator = transfer?.arguments[0]?.defaultValue;
    if (!discriminator || !('number' in discriminator)) {
        throw new Error('program must declare transfer with a constant discriminator');
    }
    return {
        accounts: [],
        data: new Uint8Array([discriminator.number, ...u64le(42n)]),
        programAddress: address(idl.program.publicKey),
    };
};

export const PRE030_PROGRAM_ADDRESS = '11111111111111111111111111111111';
// sha256('global:<name>')[0..8] derivation; exact bytes are irrelevant — the custom decoder just has to know them.
export const PRE030_WITHDRAW_DISCRIMINATOR = [183, 18, 70, 156, 148, 109, 161, 34];
// Valid discriminator width, intentionally undeclared by the simple program.
export const undeclaredInstructionData = () => Uint8Array.from([9, 9, 9, 9, 9, 9, 9, 9]);

/** A pre-0.30 Anchor IDL: top-level name/version, no `metadata.spec` — rejected by the client. */
export const pre030AnchorIdl: LegacyAnchorIdl = {
    instructions: [{ name: 'withdraw' }],
    name: 'legacy_vault',
    version: '0.0.1',
};

/** The legacy_vault document as pre-0.30 codegen shipped it — literal-typed, with args and an extra instruction. */
export const pre030GeneratedAnchorIdl = {
    instructions: [
        { args: [{ name: 'amount', type: 'u64' }], name: 'withdraw' },
        { args: [], name: 'close' },
    ],
    name: 'legacy_vault',
    version: '0.0.1',
} as const;

/** `withdraw(amount: 42)` against {@link pre030AnchorIdl}, as a kit instruction. */
export const pre030WithdrawIx: Instruction & { accounts: []; data: Uint8Array } = {
    accounts: [],
    data: new Uint8Array([...PRE030_WITHDRAW_DISCRIMINATOR, ...u64le(42n)]),
    programAddress: address(PRE030_PROGRAM_ADDRESS),
};
