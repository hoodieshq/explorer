import { readFileSync } from 'node:fs';

import { address, type Instruction } from '@solana/kit';

import type { AnchorIdl, CodamaIdl, LegacyAnchorIdl } from '../types';
import type { ExampleNativeTokenTransfers } from '../../__fixtures__/ntt';
import type { Simple } from '../../__fixtures__/simple';
import type { Simple031 } from '../../__fixtures__/simple_031';

export type { ExampleNativeTokenTransfers, Simple, Simple031 };

// Committed fixtures in idl/__fixtures__: real mainnet snapshots (let-me-buy, tokenkeg) and
// copied `anchor build` output (simple, simple-031 — refreshed by `pnpm run build:programs`).
const readIdl = (name: string): unknown =>
    JSON.parse(readFileSync(new URL(`../../__fixtures__/${name}`, import.meta.url), 'utf8'));

/** let_me_buy's IDL from its Anchor PDA (mainnet snapshot). */
export const loadLetMeBuyIdl = (): AnchorIdl => readIdl('let-me-buy.anchor.idl.json') as AnchorIdl;
/** let_me_buy's IDL from its PMP `idl` account — Anchor-format there too. */
export const loadLetMeBuyPmpIdl = (): AnchorIdl => readIdl('let-me-buy.pmp.idl.json') as AnchorIdl;
/** SPL Token's PMP-stored Codama root node (mainnet snapshot). */
export const loadTokenkegIdl = (): CodamaIdl => readIdl('tokenkeg.pmp.idl.json') as CodamaIdl;
/** IDL emitted by `anchor build` (anchor-lang 1.1.2) for `test-anchor-programs/simple`. */
export const loadSimpleIdl = (): AnchorIdl => readIdl('simple.json') as AnchorIdl;
/** Same document typed with anchor's companion type — its camelCase view matches decoded payload keys. */
export const loadSimpleIdlTyped = (): Simple => readIdl('simple.json') as Simple;
/** IDL emitted by `anchor build` (anchor-lang 0.31.1) for `test-anchor-programs/simple-031`. */
export const loadSimple031Idl = (): AnchorIdl => readIdl('simple_031.json') as AnchorIdl;
/** Same document typed with anchor's companion type. */
export const loadSimple031IdlTyped = (): Simple031 => readIdl('simple_031.json') as Simple031;
/** Real anchor-0.29 (legacy, pre-0.30) IDL — wormhole NTT `example_native_token_transfers` v3.0.0, vendored as a test sample. */
export const loadNtt029Idl = (): LegacyAnchorIdl => readIdl('ntt.json') as LegacyAnchorIdl;
/** The same document typed with anchor 0.29's companion type (`export type` + a runtime `IDL` const). */
export const loadNtt029IdlTyped = (): ExampleNativeTokenTransfers => readIdl('ntt.json') as ExampleNativeTokenTransfers;

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
