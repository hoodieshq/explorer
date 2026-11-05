import { describe, expect, it } from 'vitest';

import { parseNftokenMetadata } from '../nftoken-metadata';

describe('parseNftokenMetadata', () => {
    it('should read the name and the image', () => {
        expect(parseNftokenMetadata({ image: 'https://cdn.glow.app/a.png', name: 'Genesis: friends.glow' })).toEqual({
            kind: 'loaded',
            metadata: { image: 'https://cdn.glow.app/a.png', name: 'Genesis: friends.glow' },
        });
    });

    it('should read the description and the external URL', () => {
        expect(
            parseNftokenMetadata({
                description: ' The Genesis collection. ',
                external_url: 'https://glow.app\n',
                name: 'A',
            }),
        ).toEqual({
            kind: 'loaded',
            metadata: {
                description: 'The Genesis collection.',
                externalUrl: 'https://glow.app',
                image: undefined,
                name: 'A',
            },
        });
    });

    it.each([
        ['missing', {}],
        ['null', { description: null, external_url: null }],
        ['blank', { description: ' ', external_url: '' }],
        ['not text', { description: { en: 'A' }, external_url: 5 }],
    ])('should read a %s description and external URL as absent but keep the rest', (_, fields) => {
        expect(parseNftokenMetadata({ name: 'A', ...fields })).toEqual({
            kind: 'loaded',
            metadata: { description: undefined, externalUrl: undefined, image: undefined, name: 'A' },
        });
    });

    it('should read the traits, numbers as text', () => {
        expect(
            parseNftokenMetadata({
                name: 'A',
                traits: [
                    { trait_type: 'Glow ID', value: 'friends' },
                    { trait_type: 'Level', value: 3 },
                ],
            }),
        ).toMatchObject({
            metadata: {
                traits: [
                    { type: 'Glow ID', value: 'friends' },
                    { type: 'Level', value: '3' },
                ],
            },
        });
    });

    it('should skip traits without a text type or a text or number value', () => {
        expect(
            parseNftokenMetadata({
                name: 'A',
                traits: [
                    { trait_type: 'Glow ID', value: 'friends' },
                    { trait_type: 5, value: 'a' },
                    { trait_type: 'Nested', value: { a: 1 } },
                    { value: 'no type' },
                    'text',
                    null,
                ],
            }),
        ).toMatchObject({ metadata: { traits: [{ type: 'Glow ID', value: 'friends' }] } });
    });

    it.each([
        ['missing', {}],
        ['not a list', { traits: { 'Glow ID': 'friends' } }],
    ])('should read %s traits as absent but keep the rest', (_, fields) => {
        expect(parseNftokenMetadata({ name: 'A', ...fields })).toMatchObject({
            kind: 'loaded',
            metadata: { name: 'A', traits: undefined },
        });
    });

    it('should ignore fields outside the schema', () => {
        expect(parseNftokenMetadata({ attributes: [{ trait_type: 'Glow ID', value: 'a' }], name: 'A' })).toEqual({
            kind: 'loaded',
            metadata: { image: undefined, name: 'A' },
        });
    });

    it.each([
        ['missing', {}],
        ['null', { image: null, name: null }],
        ['empty', { image: '', name: '' }],
        ['blank', { image: '  ', name: ' \n' }],
    ])('should read %s fields as absent', (_, json) => {
        expect(parseNftokenMetadata(json)).toEqual({ kind: 'loaded', metadata: { image: undefined, name: undefined } });
    });

    it('should trim the name and the image', () => {
        expect(parseNftokenMetadata({ image: ' https://cdn.glow.app/a.png\n', name: ' A ' })).toEqual({
            kind: 'loaded',
            metadata: { image: 'https://cdn.glow.app/a.png', name: 'A' },
        });
    });

    it.each([
        ['a name that is not a string', { name: 5 }],
        ['an image that is not a string', { image: { url: 'https://cdn.glow.app/a.png' } }],
        ['an empty array', []],
        ['an array of objects', [{ name: 'A' }]],
        ['null', null],
        ['a string', 'metadata'],
        ['a number', 1],
        ['a boolean', true],
    ])('should settle %s as unavailable', (_, json) => {
        expect(parseNftokenMetadata(json)).toEqual({ kind: 'unavailable' });
    });
});
