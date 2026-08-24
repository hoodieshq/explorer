import { getNodeCodec } from '@codama/dynamic-codecs';
import {
    type AccountNode,
    accountNode,
    arrayTypeNode,
    definedTypeLinkNode,
    definedTypeNode,
    enumEmptyVariantTypeNode,
    enumTupleVariantTypeNode,
    enumTypeNode,
    fixedCountNode,
    instructionArgumentNode,
    instructionNode,
    mapTypeNode,
    numberTypeNode,
    optionTypeNode,
    prefixedCountNode,
    programNode,
    publicKeyTypeNode,
    rootNode,
    sizePrefixTypeNode,
    stringTypeNode,
    structFieldTypeNode,
    type StructFieldTypeNode,
    structTypeNode,
    tupleTypeNode,
} from 'codama';
import { describe, expect, it } from 'vitest';

import { flattenLayout, getDecodedLayout, type LayoutEntry } from '../index';
import {
    IDL_ERROR__DECODE_KIND_MISMATCH,
    IDL_ERROR__LAYOUT_NOT_ANCHORABLE,
    IDL_ERROR__LAYOUT_WALK_FAILED,
    isIdlError,
} from '../../errors';
import { anchorArm, codamaArm, unknownArm } from '../../types';

const u8 = numberTypeNode('u8');
const u16 = numberTypeNode('u16');
const u32 = numberTypeNode('u32');
const u64 = numberTypeNode('u64');
const pubkey = publicKeyTypeNode();

const ADDRESS_A = 'So11111111111111111111111111111111111111112';
const ADDRESS_B = '11111111111111111111111111111111';

// Exercises every layout rule at once: fixed scalars, a linked struct, a size-prefixed string,
// a prefixed-count array of linked structs, and a fixed-count scalar array.
const vaultAccount = accountNode({
    data: structTypeNode([
        structFieldTypeNode({ docs: ['The PDA bump.'], name: 'bump', type: u8 }),
        structFieldTypeNode({ name: 'authority', type: pubkey }),
        structFieldTypeNode({ name: 'chainId', type: definedTypeLinkNode('chainId') }),
        structFieldTypeNode({ name: 'label', type: sizePrefixTypeNode(stringTypeNode('utf8'), u32) }),
        structFieldTypeNode({
            name: 'entries',
            type: arrayTypeNode(definedTypeLinkNode('entry'), prefixedCountNode(u32)),
        }),
        structFieldTypeNode({ name: 'flags', type: arrayTypeNode(u8, fixedCountNode(3)) }),
    ]),
    name: 'vault',
});

const transferInstruction = instructionNode({
    arguments: [
        instructionArgumentNode({ name: 'discriminator', type: u8 }),
        instructionArgumentNode({ name: 'amount', type: u64 }),
    ],
    name: 'transfer',
});

const chainIdType = structTypeNode([structFieldTypeNode({ name: 'id', type: u16 })]);
const statusType = enumTypeNode([
    enumEmptyVariantTypeNode('never'),
    enumTupleVariantTypeNode('after', tupleTypeNode([u64])),
]);
const statusAccount = accountNode({
    data: structTypeNode([structFieldTypeNode({ name: 'status', type: definedTypeLinkNode('status') })]),
    name: 'status',
});
const entryType = structTypeNode([
    structFieldTypeNode({ name: 'amount', type: u64 }),
    structFieldTypeNode({ name: 'owner', type: pubkey }),
]);
// variants only — the enum flavour the codec decodes to an index rather than to a variant body
const sideType = enumTypeNode([enumEmptyVariantTypeNode('bid'), enumEmptyVariantTypeNode('ask')]);

const program = programNode({
    accounts: [vaultAccount],
    definedTypes: [
        definedTypeNode({ name: 'chainId', type: chainIdType }),
        definedTypeNode({ name: 'entry', type: entryType }),
        definedTypeNode({ name: 'rawId', type: u16 }),
        definedTypeNode({ name: 'side', type: sideType }),
        definedTypeNode({ name: 'status', type: statusType }),
    ],
    instructions: [transferInstruction],
    name: 'vault',
    publicKey: ADDRESS_B,
    version: '1.0.0',
});

const root = rootNode(program);
const accountPath = [root, program, vaultAccount] as const;
const instructionPath = [root, program, transferInstruction] as const;

const vaultValue = {
    authority: ADDRESS_A,
    bump: 3,
    chainId: { id: 7 },
    entries: [
        { amount: 10n, owner: ADDRESS_A },
        { amount: 20n, owner: ADDRESS_B },
    ],
    flags: [1, 2, 3],
    label: 'ab',
};

// The bytes are the schema's own encoding, so a range assertion measures the walk, never a hand-typed layout.
const vaultBytes = getNodeCodec(accountPath).encode(vaultValue);
const vaultDecode = codamaArm({ data: getNodeCodec(accountPath).decode(vaultBytes), path: accountPath });

/** Ranges only — the readable projection the byte inspector consumes. */
const ranges = (layout: LayoutEntry): string[] =>
    flattenLayout(layout).map(
        entry =>
            `${entry.path.join('.') || '<root>'}: ${entry.offset}..${entry.offset + entry.size} ${entry.node.kind}`,
    );

describe('getDecodedLayout', () => {
    it('should map every field of an account onto the byte range the decoder consumed', () => {
        const layout = getDecodedLayout(vaultDecode, vaultBytes);

        expect(ranges(layout)).toEqual([
            '<root>: 0..128 structTypeNode',
            'bump: 0..1 numberTypeNode',
            'authority: 1..33 publicKeyTypeNode',
            'chainId: 33..35 structTypeNode',
            'chainId.id: 33..35 numberTypeNode',
            'label: 35..41 stringTypeNode',
            'entries: 41..125 arrayTypeNode',
            'entries.0: 45..85 structTypeNode',
            'entries.0.amount: 45..53 numberTypeNode',
            'entries.0.owner: 53..85 publicKeyTypeNode',
            'entries.1: 85..125 structTypeNode',
            'entries.1.amount: 85..93 numberTypeNode',
            'entries.1.owner: 93..125 publicKeyTypeNode',
            'flags: 125..128 arrayTypeNode',
        ]);
        expect(layout.size).toBe(vaultBytes.length);
    });

    it('should cover the whole payload, leaving only framing bytes as gaps', () => {
        const layout = getDecodedLayout(vaultDecode, vaultBytes);
        const entries = layout.children;

        // fields tile the account end to end — no unaccounted bytes between them
        expect(entries.map(entry => entry.offset)).toEqual([0, 1, 33, 35, 41, 125]);
        entries.forEach((entry, index) => {
            const next = entries[index + 1];
            expect(entry.offset + entry.size).toBe(next ? next.offset : layout.size);
        });

        // the array's own 4-byte count prefix is the gap between the array and its first element
        const array = entries[4];
        expect(array?.offset).toBe(41);
        expect(array?.children[0]?.offset).toBe(45);
    });

    it('should carry the field name, the IDL docs, and the decoded value on each entry', () => {
        const layout = getDecodedLayout(vaultDecode, vaultBytes);
        const [bump, authority] = layout.children;

        expect(bump).toMatchObject({ docs: ['The PDA bump.'], name: 'bump', path: ['bump'], value: 3 });
        expect(authority).toMatchObject({ docs: [], name: 'authority', value: ADDRESS_A });
        // the root is the account's struct body — no name, no docs of its own
        expect(layout.name).toBeUndefined();
        expect(layout.path).toEqual([]);
    });

    it('should resolve a field to its own type node, penetrating wrappers and following links', () => {
        const layout = getDecodedLayout(vaultDecode, vaultBytes);
        const byName = new Map(layout.children.map(entry => [entry.name, entry]));

        // sizePrefixTypeNode(string) resolves to the string it wraps; the prefix stays framing
        expect(byName.get('label')?.node).toEqual(stringTypeNode('utf8'));
        // definedTypeLinkNode('chainId') resolves to the type codama linked it to, read off the trace
        expect(byName.get('chainId')?.node).toBe(chainIdType);
        // the linked struct is not duplicated under the field that holds it
        expect(byName.get('chainId')?.children.map(child => child.name)).toEqual(['id']);
    });

    it('should treat a scalar array as one entry holding the decoded array', () => {
        const layout = getDecodedLayout(vaultDecode, vaultBytes);
        const flags = layout.children.at(-1);

        expect(flags).toMatchObject({ children: [], name: 'flags', size: 3, value: [1, 2, 3] });
    });

    it('should map instruction arguments the same way, discriminator included', () => {
        const bytes = getNodeCodec(instructionPath).encode({ amount: 42n, discriminator: 9 });
        const decode = codamaArm({
            accounts: [],
            data: getNodeCodec(instructionPath).decode(bytes),
            path: instructionPath,
        });

        expect(ranges(getDecodedLayout(decode, bytes))).toEqual([
            '<root>: 0..9 structTypeNode',
            'discriminator: 0..1 numberTypeNode',
            'amount: 1..9 numberTypeNode',
        ]);
    });

    it("should address an option's payload under `value`, where the decode keeps it", () => {
        // the option tag is framing, so the struct it guards starts one byte into the field
        const optionalAccount = accountNode({
            data: structTypeNode([
                structFieldTypeNode({ name: 'maybeChain', type: optionTypeNode(definedTypeLinkNode('chainId')) }),
            ]),
            name: 'optional',
        });
        const path = [root, program, optionalAccount] as const;
        const bytes = getNodeCodec(path).encode({ maybeChain: { __option: 'Some', value: { id: 7 } } });
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });

        // `value` is the segment the decoded option itself uses — the path stays readable against it
        expect(ranges(getDecodedLayout(decode, bytes))).toEqual([
            '<root>: 0..3 structTypeNode',
            'maybeChain: 0..3 optionTypeNode',
            'maybeChain.value: 1..3 structTypeNode',
            'maybeChain.value.id: 1..3 numberTypeNode',
        ]);
    });

    it('should leave a None option with no payload entry at all', () => {
        const optionalAccount = accountNode({
            data: structTypeNode([
                structFieldTypeNode({ name: 'maybeChain', type: optionTypeNode(definedTypeLinkNode('chainId')) }),
            ]),
            name: 'optional',
        });
        const path = [root, program, optionalAccount] as const;
        const bytes = getNodeCodec(path).encode({ maybeChain: { __option: 'None' } });
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });

        expect(ranges(getDecodedLayout(decode, bytes))).toEqual([
            '<root>: 0..1 structTypeNode',
            'maybeChain: 0..1 optionTypeNode',
        ]);
    });

    it('should index an array element by its own position, not by the entries it produced', () => {
        // the middle option is None and describes nothing, so it must still spend index 1
        const holedAccount = accountNode({
            data: structTypeNode([
                structFieldTypeNode({
                    name: 'slots',
                    type: arrayTypeNode(optionTypeNode(definedTypeLinkNode('chainId')), fixedCountNode(3)),
                }),
            ]),
            name: 'holed',
        });
        const path = [root, program, holedAccount] as const;
        const value = {
            slots: [
                { __option: 'Some', value: { id: 1 } },
                { __option: 'None' },
                { __option: 'Some', value: { id: 3 } },
            ],
        };
        const bytes = getNodeCodec(path).encode(value);
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });

        expect(ranges(getDecodedLayout(decode, bytes))).toEqual([
            '<root>: 0..7 structTypeNode',
            'slots: 0..7 arrayTypeNode',
            'slots.0.value: 1..3 structTypeNode',
            'slots.0.value.id: 1..3 numberTypeNode',
            'slots.2.value: 5..7 structTypeNode',
            'slots.2.value.id: 5..7 numberTypeNode',
        ]);
    });

    it("should address a map's values by their decoded keys", () => {
        const bookAccount = accountNode({
            data: structTypeNode([
                structFieldTypeNode({
                    name: 'book',
                    type: mapTypeNode(
                        sizePrefixTypeNode(stringTypeNode('utf8'), u32),
                        definedTypeLinkNode('chainId'),
                        prefixedCountNode(u32),
                    ),
                }),
            ]),
            name: 'book',
        });
        const path = [root, program, bookAccount] as const;
        const bytes = getNodeCodec(path).encode({ book: { ada: { id: 1 }, bob: { id: 2 } } });
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });

        // the count prefix and each key are framing; only the values earn entries, keyed as the payload keys them
        expect(ranges(getDecodedLayout(decode, bytes))).toEqual([
            '<root>: 0..22 structTypeNode',
            'book: 0..22 mapTypeNode',
            'book.ada: 11..13 structTypeNode',
            'book.ada.id: 11..13 numberTypeNode',
            'book.bob: 20..22 structTypeNode',
            'book.bob.id: 20..22 numberTypeNode',
        ]);
    });

    it('should keep a zero-size field as a sibling instead of nesting it in the next one', () => {
        // a zero-size range shares the next field's offset, so containment cannot come from comparing ranges
        const paddedAccount = accountNode({
            data: structTypeNode([
                structFieldTypeNode({ name: 'reserved', type: arrayTypeNode(u8, fixedCountNode(0)) }),
                structFieldTypeNode({ name: 'total', type: u32 }),
            ]),
            name: 'padded',
        });
        const path = [root, program, paddedAccount] as const;
        const bytes = getNodeCodec(path).encode({ reserved: [], total: 7 });
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });

        expect(ranges(getDecodedLayout(decode, bytes))).toEqual([
            '<root>: 0..4 structTypeNode',
            'reserved: 0..0 arrayTypeNode',
            'total: 0..4 numberTypeNode',
        ]);
    });

    it('should type a single-member container as itself, not as the member it holds', () => {
        // the sole member spans the whole field, so a link lookup that keeps descending reports `u16`
        const wrapperAccount = accountNode({
            data: structTypeNode([
                structFieldTypeNode({
                    name: 'wrapper',
                    type: structTypeNode([structFieldTypeNode({ name: 'id', type: definedTypeLinkNode('rawId') })]),
                }),
            ]),
            name: 'wrapper',
        });
        const path = [root, program, wrapperAccount] as const;
        const bytes = getNodeCodec(path).encode({ wrapper: { id: 5 } });
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });
        const [wrapper] = getDecodedLayout(decode, bytes).children;

        expect(wrapper?.node.kind).toBe('structTypeNode');
        expect(ranges(getDecodedLayout(decode, bytes))).toEqual([
            '<root>: 0..2 structTypeNode',
            'wrapper: 0..2 structTypeNode',
            'wrapper.id: 0..2 numberTypeNode',
        ]);
    });

    it("should leave a data enum's discriminant as a gap and address the variant's own members", () => {
        const path = [root, program, statusAccount] as const;
        const bytes = getNodeCodec(path).encode({ status: { __kind: 'After', fields: [42n] } });
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });

        // the field starts at 0, the variant's tuple at 1 — the 1-byte discriminant is the gap between
        expect(ranges(getDecodedLayout(decode, bytes))).toEqual([
            '<root>: 0..9 structTypeNode',
            'status: 0..9 enumTypeNode',
            'status.fields: 1..9 tupleTypeNode',
        ]);
    });

    it('should treat a variant-only enum as a value, not as a container to drill into', () => {
        // it decodes to an index, so an element entry would repeat what one range and one value say —
        // the same reason a `[u8; N]` element earns none
        const sidedAccount = accountNode({
            data: structTypeNode([
                structFieldTypeNode({
                    name: 'sides',
                    type: arrayTypeNode(definedTypeLinkNode('side'), fixedCountNode(3)),
                }),
                structFieldTypeNode({ name: 'mode', type: definedTypeLinkNode('side') }),
            ]),
            name: 'sided',
        });
        const path = [root, program, sidedAccount] as const;
        const bytes = Uint8Array.from([0, 1, 0, 1]);
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });
        const layout = getDecodedLayout(decode, bytes);

        expect(ranges(layout)).toEqual([
            '<root>: 0..4 structTypeNode',
            'sides: 0..3 arrayTypeNode',
            'mode: 3..4 enumTypeNode',
        ]);
        // the array keeps the decoded elements as its value, and the field still resolves to the enum
        expect(layout.children[0]).toMatchObject({ children: [], value: [0, 1, 0] });
        expect(layout.children[1]?.node).toBe(sideType);
    });

    it('should keep the trace proportional to the schema, not to the element count', () => {
        // 65_536 element reads describe one entry; recording each one made the walk quadratic
        const blobAccount = accountNode({
            data: structTypeNode([
                structFieldTypeNode({ name: 'blob', type: arrayTypeNode(u8, fixedCountNode(65_536)) }),
            ]),
            name: 'blob',
        });
        const path = [root, program, blobAccount] as const;
        const bytes = getNodeCodec(path).encode({ blob: Array.from({ length: 65_536 }, () => 1) });
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });

        const started = performance.now();
        const layout = getDecodedLayout(decode, bytes);
        const elapsed = performance.now() - started;

        expect(flattenLayout(layout)).toHaveLength(2);
        // a generous ceiling — the quadratic build took ~300ms here, a linear one takes ~20ms
        expect(elapsed).toBeLessThan(150);
    });

    it('should default docs to an empty array when the node declares none', () => {
        // a hand-written Codama root may omit `docs` entirely, unlike anything the node constructors emit
        const bareField = { kind: 'structFieldTypeNode', name: 'bare', type: u8 } as StructFieldTypeNode;
        const bareAccount = accountNode({ data: structTypeNode([bareField]), name: 'bare' });
        const path = [root, program, bareAccount] as const;
        const bytes = Uint8Array.from([1]);
        const decode = codamaArm({ data: getNodeCodec(path).decode(bytes), path });

        expect(getDecodedLayout(decode, bytes).children[0]).toMatchObject({ docs: [], name: 'bare' });
    });

    it('should span only the bytes the schema reads, leaving a longer buffer partly unclaimed', () => {
        const padded = new Uint8Array(vaultBytes.length + 16);
        padded.set(vaultBytes, 0);
        const decode = codamaArm({ data: getNodeCodec(accountPath).decode(padded), path: accountPath });

        // real accounts carry trailing space (reallocation, extensions) — the layout describes the schema
        expect(getDecodedLayout(decode, padded)).toMatchObject({ offset: 0, size: vaultBytes.length });
    });

    it('should report a payload with no container to anchor a range to under its own code', () => {
        const scalarAccount = accountNode({ data: structTypeNode([]), name: 'scalar' });
        // AccountNode.data is typed as a struct; a hand-written root can still carry a bare scalar
        const forged = { ...scalarAccount, data: u8 } as unknown as AccountNode;
        const path = [root, program, forged] as const;
        const bytes = Uint8Array.from([1]);

        try {
            getDecodedLayout(codamaArm({ data: 1, path }), bytes);
            expect.unreachable('a bare scalar payload must not produce a layout');
        } catch (error) {
            // a healthy decode the walk cannot describe is not the same failure as bytes it cannot replay
            if (!isIdlError(error, IDL_ERROR__LAYOUT_NOT_ANCHORABLE)) throw error;
            expect(error.context).toEqual({ kind: 'accountNode' });
        }
    });

    it('should throw the typed kind mismatch for arms the walk cannot serve', () => {
        for (const decode of [anchorArm({ bump: 3 }), unknownArm([])]) {
            expect(() => getDecodedLayout(decode, vaultBytes)).toThrow(
                expect.objectContaining({ code: IDL_ERROR__DECODE_KIND_MISMATCH }),
            );
        }
    });

    it('should report bytes the decode cannot be replayed against as a layout walk failure', () => {
        const truncated = vaultBytes.subarray(0, 20);

        try {
            getDecodedLayout(vaultDecode, truncated);
            expect.unreachable('a truncated payload must not produce a layout');
        } catch (error) {
            if (!isIdlError(error, IDL_ERROR__LAYOUT_WALK_FAILED)) throw error;
            expect(error.context).toMatchObject({ dataLength: 20 });
            expect(error.cause).toBeDefined();
        }
    });
});

describe('flattenLayout', () => {
    it('should list parents before their children, in byte order', () => {
        const layout = getDecodedLayout(vaultDecode, vaultBytes);

        expect(flattenLayout(layout)[0]).toBe(layout);
        expect(flattenLayout(layout)).toHaveLength(14);
    });
});
