import { address, type Instruction } from '@solana/kit';
import {
    fieldDiscriminatorNode,
    instructionArgumentNode,
    instructionNode,
    numberTypeNode,
    numberValueNode,
    programNode,
    rootNode,
} from 'codama';

import type { AnchorIdl, CodamaIdl, LegacyAnchorIdl } from '../types';

export const ANCHOR_PROGRAM_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const CODAMA_PROGRAM_ADDRESS = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const PRE030_PROGRAM_ADDRESS = '11111111111111111111111111111111';

export const ANCHOR_INCREMENT_DISCRIMINATOR = [11, 18, 104, 9, 104, 174, 59, 33];
// sha256('global:<name>')[0..8] derivation; exact bytes are irrelevant — the custom decoder just has to know them.
export const PRE030_WITHDRAW_DISCRIMINATOR = [183, 18, 70, 156, 148, 109, 161, 34];

/** A minimal modern (spec 0.1.0) Anchor IDL: `increment(amount: u64)`. */
export const anchorIdl: AnchorIdl = {
    address: ANCHOR_PROGRAM_ADDRESS,
    instructions: [
        {
            accounts: [{ name: 'counter', writable: true }],
            args: [{ name: 'amount', type: 'u64' }],
            discriminator: ANCHOR_INCREMENT_DISCRIMINATOR,
            name: 'increment',
        },
    ],
    metadata: { name: 'counter', spec: '0.1.0', version: '1.2.3' },
};

/** A minimal Codama root node (PMP style): `transfer(amount: u64)` behind a u8 field discriminator. */
export const codamaIdl: CodamaIdl = rootNode(
    programNode({
        instructions: [
            instructionNode({
                arguments: [
                    instructionArgumentNode({
                        defaultValue: numberValueNode(3),
                        defaultValueStrategy: 'omitted',
                        name: 'discriminator',
                        type: numberTypeNode('u8'),
                    }),
                    instructionArgumentNode({ name: 'amount', type: numberTypeNode('u64') }),
                ],
                discriminators: [fieldDiscriminatorNode('discriminator')],
                name: 'transfer',
            }),
        ],
        name: 'tokenVault',
        publicKey: CODAMA_PROGRAM_ADDRESS,
        version: '1.0.0',
    }),
);

/** A pre-0.30 Anchor IDL: top-level name/version, no `metadata.spec` — rejected by the client. */
export const pre030AnchorIdl: LegacyAnchorIdl = {
    instructions: [{ name: 'withdraw' }],
    name: 'legacy_vault',
    version: '0.0.1',
};

/** The same legacy document as a compile-time literal — what pre-0.30 `anchor build` codegen shipped. */
export const pre030GeneratedAnchorIdl = {
    instructions: [
        { args: [{ name: 'amount', type: 'u64' }], name: 'withdraw' },
        { args: [], name: 'close' },
    ],
    name: 'legacy_vault',
    version: '0.0.1',
} as const;

export { loadLetMeBuyIdl, loadLetMeBuyPmpIdl } from './generated/let-me-buy';
export { loadSimple031Idl } from './generated/simple-031';
export { loadSimpleIdl } from './generated/simple';
export { loadTokenkegIdl } from './generated/tokenkeg';

export const u64le = (value: bigint): number[] => {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, value, true);
    return Array.from(bytes);
};

/** `increment(amount: 42)` against {@link anchorIdl}, as a kit instruction. */
export const anchorIncrementIx: Instruction & { accounts: []; data: Uint8Array } = {
    accounts: [],
    data: new Uint8Array([...ANCHOR_INCREMENT_DISCRIMINATOR, ...u64le(42n)]),
    programAddress: address(ANCHOR_PROGRAM_ADDRESS),
};

/** `transfer(amount: 42)` against {@link codamaIdl}, as a kit instruction. */
export const codamaTransferIx: Instruction & { accounts: []; data: Uint8Array } = {
    accounts: [],
    data: new Uint8Array([3, ...u64le(42n)]),
    programAddress: address(CODAMA_PROGRAM_ADDRESS),
};

/** `withdraw(amount: 42)` against {@link pre030AnchorIdl}, as a kit instruction. */
export const pre030WithdrawIx: Instruction & { accounts: []; data: Uint8Array } = {
    accounts: [],
    data: new Uint8Array([...PRE030_WITHDRAW_DISCRIMINATOR, ...u64le(42n)]),
    programAddress: address(PRE030_PROGRAM_ADDRESS),
};

export const VAULT_PROGRAM_ADDRESS = 'So11111111111111111111111111111111111111112';
export const VAULT_DEPOSIT_DISCRIMINATOR = [242, 35, 198, 137, 82, 225, 242, 182];
export const VAULT_ACCOUNT_DISCRIMINATOR = [211, 8, 232, 43, 2, 152, 117, 119];
export const VAULT_EVENT_DISCRIMINATOR = [141, 25, 2, 217, 138, 44, 63, 87];

/** What `anchor build` emits into `target/types/` — a literal type mirroring the vault IDL JSON below. */
export type VaultIdl = {
    address: 'So11111111111111111111111111111111111111112';
    metadata: { name: 'vault'; spec: '0.1.0'; version: '0.1.0' };
    instructions: [
        {
            accounts: [{ name: 'vault'; writable: true }];
            args: [{ name: 'amount'; type: 'u64' }];
            discriminator: [242, 35, 198, 137, 82, 225, 242, 182];
            name: 'deposit';
        },
    ];
    accounts: [{ discriminator: [211, 8, 232, 43, 2, 152, 117, 119]; name: 'vault' }];
    events: [{ discriminator: [141, 25, 2, 217, 138, 44, 63, 87]; name: 'depositMade' }];
    errors: [{ code: 6000; msg: 'Insufficient funds'; name: 'insufficientFunds' }];
    types: [
        { name: 'depositMade'; type: { fields: [{ name: 'amount'; type: 'u64' }]; kind: 'struct' } },
        { name: 'vault'; type: { fields: [{ name: 'balance'; type: 'u64' }]; kind: 'struct' } },
    ];
};

/** The runtime IDL JSON matching {@link VaultIdl} — the pair codegen keeps in sync since anchor 0.30. */
export const vaultIdl: VaultIdl = {
    accounts: [{ discriminator: [211, 8, 232, 43, 2, 152, 117, 119], name: 'vault' }],
    address: 'So11111111111111111111111111111111111111112',
    errors: [{ code: 6000, msg: 'Insufficient funds', name: 'insufficientFunds' }],
    events: [{ discriminator: [141, 25, 2, 217, 138, 44, 63, 87], name: 'depositMade' }],
    instructions: [
        {
            accounts: [{ name: 'vault', writable: true }],
            args: [{ name: 'amount', type: 'u64' }],
            discriminator: [242, 35, 198, 137, 82, 225, 242, 182],
            name: 'deposit',
        },
    ],
    metadata: { name: 'vault', spec: '0.1.0', version: '0.1.0' },
    types: [
        { name: 'depositMade', type: { fields: [{ name: 'amount', type: 'u64' }], kind: 'struct' } },
        { name: 'vault', type: { fields: [{ name: 'balance', type: 'u64' }], kind: 'struct' } },
    ],
};

/** `deposit(amount: 42)` against {@link vaultIdl}, as a kit instruction. */
export const vaultDepositIx: Instruction & { accounts: []; data: Uint8Array } = {
    accounts: [],
    data: new Uint8Array([...VAULT_DEPOSIT_DISCRIMINATOR, ...u64le(42n)]),
    programAddress: address(VAULT_PROGRAM_ADDRESS),
};
