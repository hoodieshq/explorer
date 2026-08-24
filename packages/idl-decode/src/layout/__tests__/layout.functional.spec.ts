// Real IDLs, real bytes — the offsets asserted here are the programs' published layouts, so a drift in
// the walk shows up as a disagreement with the spec, not with a hand-typed expectation.
import { getNodeCodec } from '@codama/dynamic-codecs';
import { address, getAddressEncoder, getU64Encoder, isFixedSize, type ReadonlyUint8Array } from '@solana/kit';
import type { AccountNode, NodePath, ProgramNode, RootNode } from 'codama';
import { describe, expect, it } from 'vitest';

import { flattenLayout, getDecodedLayout, type LayoutEntry } from '../index';
import { convertToCodama } from '../../anchor/convert';
import { createIdlClient } from '../../client';
import { getDecodedEntries } from '../../entries/index';
import { loadAmmV3Idl, loadLetMeBuyIdl, loadTokenkegIdl } from '../../__tests__/fixtures';
import { type AnchorIdl, codamaArm, type CodamaIdl } from '../../types';

const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

/** The account's node path in its own root — what the encode side needs and a decode hands back for free. */
function accountPath(root: RootNode, name: string): NodePath<AccountNode> {
    const program: ProgramNode = root.program;
    const account = program.accounts.find(candidate => candidate.name === name);
    if (!account) throw new Error(`the fixture must declare the ${name} account`);
    return [root, program, account];
}

function toCodamaRoot(idl: AnchorIdl): CodamaIdl {
    const [error, root] = convertToCodama(idl);
    if (error) throw error;
    return root;
}

/** Layout invariants no schema may break — asserted on every fixture rather than restated per case. */
function expectWellFormed(layout: LayoutEntry, data: ReadonlyUint8Array): void {
    expect({ offset: layout.offset, size: layout.size }).toEqual({ offset: 0, size: data.length });

    for (const entry of flattenLayout(layout)) {
        let previousEnd = entry.offset;
        for (const child of entry.children) {
            // inside the parent, in byte order, never overlapping a sibling
            expect(child.offset).toBeGreaterThanOrEqual(previousEnd);
            expect(child.offset + child.size).toBeLessThanOrEqual(entry.offset + entry.size);
            previousEnd = child.offset + child.size;
        }
    }
}

/**
 * Every entry's path must address that entry's own value in the decoded payload. This is the contract
 * a consumer acts on — reading `path` out of the decode has to land on the bytes the entry describes —
 * so it is asserted against the payload itself, not against another walk of the same schema.
 */
function expectPathsAddressPayload(layout: LayoutEntry, payload: unknown): void {
    const rows = flattenLayout(layout);
    for (const entry of rows) {
        expect(readPath(payload, entry.path)).toEqual(entry.value);
    }
    // a path is a key, so no two rows may claim the same one
    const paths = rows.map(entry => entry.path.join('.'));
    expect(new Set(paths).size).toBe(paths.length);
}

function readPath(payload: unknown, path: readonly (number | string)[]): unknown {
    return path.reduce<unknown>(
        (value, segment) =>
            // eslint-disable-next-line typescript/consistent-type-assertions -- dynamically decoded payload; the layout names the members read off it
            typeof value === 'object' && value !== null
                ? (value as Record<number | string, unknown>)[segment]
                : undefined,
        payload,
    );
}

describe('getDecodedLayout over real IDLs', () => {
    it('should reproduce the published SPL Token account layout from the PMP codama root', () => {
        // A 165-byte token account: wrapped SOL mint, 1_000_000 lamports, initialized, no delegate.
        const data = new Uint8Array(165);
        data.set(getAddressEncoder().encode(address(WRAPPED_SOL)), 0);
        data.set(getAddressEncoder().encode(address(SYSTEM_PROGRAM)), 32);
        data.set(getU64Encoder().encode(1_000_000n), 64);
        data[108] = 1;

        const client = createIdlClient(loadTokenkegIdl());
        const decode = client.decodeAccount(data);
        const layout = getDecodedLayout(decode, data);

        expect(layout.children.map(field => [field.name, field.offset, field.size])).toEqual([
            ['mint', 0, 32],
            ['owner', 32, 32],
            ['amount', 64, 8],
            // COption<Pubkey> is a fixed 4-byte tag plus the 32-byte payload
            ['delegate', 72, 36],
            ['state', 108, 1],
            ['isNative', 109, 12],
            ['delegatedAmount', 121, 8],
            ['closeAuthority', 129, 36],
        ]);
        expectWellFormed(layout, data);
        expectPathsAddressPayload(layout, client.getDecodedData(decode));
    });

    it("should carry the program's own Rust docs onto the fields", () => {
        const data = new Uint8Array(165);
        data[108] = 1;

        const client = createIdlClient(loadTokenkegIdl());
        const layout = getDecodedLayout(client.decodeAccount(data), data);
        const mint = layout.children[0];

        expect(mint?.docs).toEqual(['The mint associated with this account.']);
    });

    it('should resolve a Vec of linked structs element by element (legacy anchor, variable size)', () => {
        const root = toCodamaRoot(loadLetMeBuyIdl());
        const path = accountPath(root, 'receipts');
        const data = getNodeCodec(path).encode({
            authority: SYSTEM_PROGRAM,
            bump: 4,
            details: '',
            discriminator: ['base16', 'def5ed403b311df6'],
            products: [{ decimals: 6, mint: SYSTEM_PROGRAM, name: 'Espresso', price: 250n }],
            receipts: [
                {
                    buyer: WRAPPED_SOL,
                    price: 250n,
                    productName: 'Espresso',
                    receiptId: 1n,
                    tableNumber: 7,
                    timestamp: 1_700_000_000n,
                    wasDelivered: true,
                },
            ],
            storeName: 'Cafe',
            telegramChannelId: '',
            totalPurchases: 1n,
        });

        const client = createIdlClient(root);
        const decode = client.decodeAccount(data);
        const layout = getDecodedLayout(decode, data);
        const receipts = layout.children.find(field => field.name === 'receipts');

        // the Vec's 4-byte count prefix sits between the field and its first element
        expect(receipts).toMatchObject({ offset: 8, size: 74 });
        expect(receipts?.children[0]).toMatchObject({ offset: 12, path: ['receipts', 0], size: 70 });
        expect(receipts?.children[0]?.children.map(field => [field.name, field.offset, field.size])).toEqual([
            ['receiptId', 12, 8],
            ['buyer', 20, 32],
            ['wasDelivered', 52, 1],
            ['price', 53, 8],
            ['timestamp', 61, 8],
            ['tableNumber', 69, 1],
            // 4-byte length prefix plus 'Espresso'
            ['productName', 70, 12],
        ]);
        expectWellFormed(layout, data);
        expectPathsAddressPayload(layout, client.getDecodedData(decode));
        // the layout stops at the array it can measure; `getDecodedEntries` keeps going into its scalars
        expect(getDecodedEntries(decode).map(entry => entry.path.join('.'))).toContain('receipts.0.productName');
    });

    it('should keep a large fixed-size account to one entry per named field, not one per array element', () => {
        const root = toCodamaRoot(loadAmmV3Idl());
        const path = accountPath(root, 'tickArrayState');
        const codec = getNodeCodec(path);
        if (!isFixedSize(codec)) throw new Error('tickArrayState must be fixed size');

        // Every byte is a valid zero for this schema; the arm is built straight from the path, so this
        // case measures the walk over a big nested layout without also re-testing identification.
        const data = new Uint8Array(codec.fixedSize);
        const payload = codec.decode(data);
        const layout = getDecodedLayout(codamaArm({ data: payload, path }), data);

        expect(layout.size).toBe(10_240);
        // bounded by the schema's names — 60 ticks × (a tick body + its fields) plus the account's own
        // fields — not by the ~2000 codec reads the walk observed
        expect(flattenLayout(layout).length).toBeLessThan(600);
        expectWellFormed(layout, data);
        expectPathsAddressPayload(layout, payload);
    });
});
