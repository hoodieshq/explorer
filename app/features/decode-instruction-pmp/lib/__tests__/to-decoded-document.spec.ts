import { Format } from '@solana-program/program-metadata';
import { describe, expect, it } from 'vitest';

import { toDecodedDocument } from '../to-decoded-document';

describe('toDecodedDocument', () => {
    it('should parse a JSON document so the viewer can render it as a tree', () => {
        expect(toDecodedDocument('{"name":"company","version":"1.0.0"}', Format.Json)).toEqual({
            kind: 'json',
            value: { name: 'company', version: '1.0.0' },
        });
    });

    it('should parse a JSON array document', () => {
        expect(toDecodedDocument('[1,2]', Format.Json)).toEqual({ kind: 'json', value: [1, 2] });
    });

    it('should fall back to verbatim text when Format is Json but the text does not parse', () => {
        expect(toDecodedDocument('{not json', Format.Json)).toEqual({ kind: 'text', text: '{not json' });
    });

    it('should fall back to verbatim text when a Json payload parses to a scalar', () => {
        // react-json-view requires an object or array root, and a bare scalar reads fine as text anyway.
        expect(toDecodedDocument('42', Format.Json)).toEqual({ kind: 'text', text: '42' });
        expect(toDecodedDocument('null', Format.Json)).toEqual({ kind: 'text', text: 'null' });
    });

    it('should render Yaml and Toml verbatim without pulling in a parser', () => {
        expect(toDecodedDocument('name: company\n', Format.Yaml)).toEqual({ kind: 'text', text: 'name: company\n' });
        expect(toDecodedDocument('name = "company"', Format.Toml)).toEqual({
            kind: 'text',
            text: 'name = "company"',
        });
    });

    it('should render Format None verbatim', () => {
        expect(toDecodedDocument('deadbeef', Format.None)).toEqual({ kind: 'text', text: 'deadbeef' });
    });
});
