import {
    bytesTypeNode,
    bytesValueNode,
    constantDiscriminatorNode,
    constantValueNode,
    fieldDiscriminatorNode,
    fixedSizeTypeNode,
    instructionArgumentNode,
    type InstructionArgumentNode,
    instructionNode,
    type InstructionNode,
    numberTypeNode,
    numberValueNode,
    programNode,
    rootNode,
    sizeDiscriminatorNode,
} from 'codama';
import { describe, expect, it } from 'vitest';

import { buildInstructionNameResolver, buildInstructionNameTable, buildProgramName } from '../../names';
import { loadTokenkegIdl, transferIx } from '../fixtures';

const rootWith = (instruction: InstructionNode) =>
    rootNode(
        programNode({
            instructions: [instruction],
            name: 'probe',
            publicKey: '11111111111111111111111111111111',
            version: '1.0.0',
        }),
    );

const discriminatorArg = (
    type: InstructionArgumentNode['type'],
    defaultValue?: InstructionArgumentNode['defaultValue'],
) => instructionArgumentNode({ defaultValue, defaultValueStrategy: 'omitted', name: 'discriminator', type });

const fieldIx = (type: InstructionArgumentNode['type'], defaultValue?: InstructionArgumentNode['defaultValue']) =>
    instructionNode({
        arguments: [discriminatorArg(type, defaultValue)],
        discriminators: [fieldDiscriminatorNode('discriminator')],
        name: 'probe',
    });

describe('buildProgramName (Codama)', () => {
    it('should title-case the program node name', () => {
        expect(buildProgramName(loadTokenkegIdl())).toBe('Token');
    });
});

describe('instruction names (Codama)', () => {
    it('should build entries from constant field discriminators', () => {
        const table = buildInstructionNameTable(loadTokenkegIdl());
        expect(table.length).toBeGreaterThan(1);
        expect(table).toContainEqual({ discriminator: Uint8Array.from([3]), name: 'Transfer' });
    });

    it('should resolve an instruction name from instruction data', () => {
        const tokenkeg = loadTokenkegIdl();
        const resolve = buildInstructionNameResolver(tokenkeg);
        expect(resolve?.(transferIx(tokenkeg).data)).toBe('Transfer');
    });
});

describe('codama discriminator shapes', () => {
    it('should encode multi-byte number discriminators little-endian (u32)', () => {
        const table = buildInstructionNameTable(rootWith(fieldIx(numberTypeNode('u32'), numberValueNode(0x01020304))));
        expect(table).toEqual([{ discriminator: Uint8Array.from([4, 3, 2, 1]), name: 'Probe' }]);
    });

    it('should encode 64-bit number discriminators', () => {
        const table = buildInstructionNameTable(rootWith(fieldIx(numberTypeNode('u64'), numberValueNode(7))));
        expect(table).toEqual([{ discriminator: Uint8Array.from([7, 0, 0, 0, 0, 0, 0, 0]), name: 'Probe' }]);
    });

    it('should decode the byte defaults rootNodeFromAnchor emits (fixed-size base16 bytes)', () => {
        const table = buildInstructionNameTable(
            rootWith(fieldIx(fixedSizeTypeNode(bytesTypeNode(), 8), bytesValueNode('base16', '0b12680968ae3b21'))),
        );
        expect(table).toEqual([{ discriminator: Uint8Array.from([11, 18, 104, 9, 104, 174, 59, 33]), name: 'Probe' }]);
    });

    it('should build entries from constant discriminator nodes', () => {
        const table = buildInstructionNameTable(
            rootWith(
                instructionNode({
                    discriminators: [
                        constantDiscriminatorNode(constantValueNode(numberTypeNode('u8'), numberValueNode(9))),
                    ],
                    name: 'probe',
                }),
            ),
        );
        expect(table).toEqual([{ discriminator: Uint8Array.from([9]), name: 'Probe' }]);
    });

    it.each([
        [
            'two discriminators',
            instructionNode({
                arguments: [discriminatorArg(numberTypeNode('u8'), numberValueNode(1))],
                discriminators: [fieldDiscriminatorNode('discriminator'), sizeDiscriminatorNode(16)],
                name: 'probe',
            }),
        ],
        [
            'a non-field non-constant node',
            instructionNode({ discriminators: [sizeDiscriminatorNode(8)], name: 'probe' }),
        ],
        [
            'a field at a non-zero offset',
            instructionNode({
                arguments: [discriminatorArg(numberTypeNode('u8'), numberValueNode(1))],
                discriminators: [fieldDiscriminatorNode('discriminator', 1)],
                name: 'probe',
            }),
        ],
        [
            'a constant at a non-zero offset',
            instructionNode({
                discriminators: [
                    constantDiscriminatorNode(constantValueNode(numberTypeNode('u8'), numberValueNode(9)), 1),
                ],
                name: 'probe',
            }),
        ],
        [
            'a field without a matching argument',
            instructionNode({ discriminators: [fieldDiscriminatorNode('nope')], name: 'probe' }),
        ],
        ['an argument without a default value', fieldIx(numberTypeNode('u8'))],
        ['an unsupported number format', fieldIx(numberTypeNode('f32'), numberValueNode(1))],
    ])('should skip unresolvable discriminators: %s', (_shape, instruction) => {
        expect(buildInstructionNameTable(rootWith(instruction))).toEqual([]);
    });
});
