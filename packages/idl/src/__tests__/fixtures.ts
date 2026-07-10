import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { address, type Instruction } from '@solana/kit';

import type { AnchorIdl, CodamaIdl, LegacyAnchorIdl } from '../types';
import type { ExampleNativeTokenTransfers } from '../../__fixtures__/example_native_token_transfers';
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
export const loadNtt029Idl = (): LegacyAnchorIdl => readIdl('example_native_token_transfers.json') as LegacyAnchorIdl;
/** `amm_v3` in v0.1 shape — the app's convert-legacy-idl output over the on-chain 0.29 doc; its spec-correct alias typedef (`kind: 'type'`) is what pristine nodes-from-anchor 1.3.8 rejects. */
export const loadAmmV3Idl = (): AnchorIdl => readIdl('amm-v3-0.30.1.json') as AnchorIdl;
/** The same document typed with anchor 0.29's companion type (`export type` + a runtime `IDL` const). */
export const loadNtt029IdlTyped = (): ExampleNativeTokenTransfers =>
    readIdl('example_native_token_transfers.json') as ExampleNativeTokenTransfers;

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

// wormhole NTT's real mainnet program id (declare_id! in example-native-token-transfers) — a real
// pre-0.30 Anchor program, so the legacy fixtures don't impersonate the System Program (`1111…`).
export const NTT_PROGRAM_ADDRESS = 'nttiK1SepaQt6sZ4WGW5whvc9tEnGXGxuKeptcQPCcS';
// Anchor (<= 0.29) derives an instruction discriminator as sha256('global:<snake_case_name>')[..8].
const legacyAnchorDiscriminator = (snakeName: string): number[] =>
    Array.from(createHash('sha256').update(`global:${snakeName}`).digest().subarray(0, 8));
// The real discriminator for NTT's `transfer_burn` instruction (its IDL name is the camelCase `transferBurn`).
export const NTT_TRANSFER_BURN_DISCRIMINATOR = legacyAnchorDiscriminator('transfer_burn');
// Valid discriminator width, intentionally undeclared by the simple program.
export const undeclaredInstructionData = () => Uint8Array.from([9, 9, 9, 9, 9, 9, 9, 9]);

/** A real anchor-0.29 instruction's bytes — NTT `transfer_burn` (real id + derived discriminator + a u64 arg). */
export const ntt029TransferIx: Instruction & { accounts: []; data: Uint8Array } = {
    accounts: [],
    data: new Uint8Array([...NTT_TRANSFER_BURN_DISCRIMINATOR, ...u64le(42n)]),
    programAddress: address(NTT_PROGRAM_ADDRESS),
};
