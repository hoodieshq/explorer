import { convertType, type DisplayIdlType } from '../converters/convert-display-idl';

/**
 * Spec test for the implementation to display types in read-only mode
 */
describe('[idl] convert-display-idl', () => {
    describe('convertType', () => {
        it('should parse leaves', () => {
            const leavesTypeArg = { name: 'leaves', type: { vec: { defined: '(u8,[u8;32])' } } };
            expect(convertType(leavesTypeArg.type)).toEqual({
                vec: {
                    defined: {
                        generics: [],
                        name: '(u8,[u8;32])',
                    },
                },
            });
        });

        it('should parse type.option.tuple', () => {
            const type = { option: { tuple: ['u64', 'u64'] } } as DisplayIdlType;
            const expectedOutput = {
                option: {
                    defined: {
                        generics: [
                            { kind: 'type', type: 'u64' },
                            { kind: 'type', type: 'u64' },
                        ],
                        name: 'tuple[u64]',
                    },
                },
            };
            // @ts-expect-error expect type error
            expect(convertType(type)).toEqual(expectedOutput);
        });

        it('should parse type.vec.tuple', () => {
            const type = { vec: { tuple: ['string', 'string'] } };
            const expectedOutput = {
                vec: {
                    defined: {
                        generics: [
                            { kind: 'type', type: 'string' },
                            { kind: 'type', type: 'string' },
                        ],
                        name: 'tuple[string]',
                    },
                },
            };
            // @ts-expect-error expect type error
            expect(convertType(type)).toEqual(expectedOutput);
        });
    });
});
