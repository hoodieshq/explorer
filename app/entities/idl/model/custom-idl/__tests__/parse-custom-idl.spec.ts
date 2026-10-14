import { describe, expect, it } from 'vitest';

import { parseCustomIdl } from '../parse-custom-idl';

const PROGRAM = 'AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye';
const OTHER = 'ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S';

const anchorIdl = (address?: string) => ({ address, instructions: [], metadata: { name: 'voting', spec: '0.1.0' } });
const codamaIdl = (publicKey: string) => ({
    kind: 'rootNode',
    program: { instructions: [], name: 'voting', publicKey },
    standard: 'codama',
    version: '1.0.0',
});

describe('parseCustomIdl', () => {
    it('should accept a modern Anchor IDL for the program', () => {
        const result = parseCustomIdl(JSON.stringify(anchorIdl(PROGRAM)), PROGRAM);
        expect(result).toEqual({ idl: anchorIdl(PROGRAM), ok: true });
    });

    it('should accept a Codama IDL for the program', () => {
        const result = parseCustomIdl(JSON.stringify(codamaIdl(PROGRAM)), PROGRAM);
        expect(result.ok).toBe(true);
    });

    it('should accept a legacy Anchor IDL that declares no address', () => {
        const legacy = { instructions: [], name: 'voting', version: '0.1.0' };
        expect(parseCustomIdl(JSON.stringify(legacy), PROGRAM).ok).toBe(true);
    });

    it('should reject an IDL that declares another program', () => {
        expect(parseCustomIdl(JSON.stringify(anchorIdl(OTHER)), PROGRAM)).toEqual({
            error: `This IDL is for program ${OTHER}, not ${PROGRAM}.`,
            ok: false,
        });
        expect(parseCustomIdl(JSON.stringify(codamaIdl(OTHER)), PROGRAM).ok).toBe(false);
    });

    it('should reject a legacy IDL whose metadata names another program', () => {
        const legacy = { instructions: [], metadata: { address: OTHER }, name: 'voting' };
        expect(parseCustomIdl(JSON.stringify(legacy), PROGRAM).ok).toBe(false);
    });

    it('should reject text that is not JSON', () => {
        expect(parseCustomIdl('{ not json', PROGRAM)).toEqual({ error: 'The file is not valid JSON.', ok: false });
    });

    it('should reject JSON that is not an IDL', () => {
        expect(parseCustomIdl(JSON.stringify({ name: 'voting' }), PROGRAM)).toEqual({
            error: 'This JSON is not an Anchor or Codama IDL.',
            ok: false,
        });
    });
});
