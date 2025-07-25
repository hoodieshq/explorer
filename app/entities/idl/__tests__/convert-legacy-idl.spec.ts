import { convertType } from '../converters/convert-legacy-idl';

/**
 * Spec test for the improved implementation for the Explorer
 */
describe('[idl] convert-legacy-idl', () => {
    describe('convertType', () => {
        it('should parse leaves', () => {
            const leavesTypeArg = { name: 'leaves', type: { vec: { defined: '(u8,[u8;32])' } } };
            expect(convertType(leavesTypeArg.type)).toEqual({
                vec: {
                    array: ['u8', 33],
                },
            });
        });

        it('should parse type.option.tuple', () => {
            const type = { option: { tuple: ['u64', 'u64'] } };
            // @ts-expect-error expect type error
            expect(convertType(type)).toEqual({ option: { array: ['u64', 2] } });
        });

        it('should parse type.vec.tuple', () => {
            const type = { vec: { tuple: ['string', 'string'] } };
            // @ts-expect-error expect type error
            expect(convertType(type)).toEqual({ vec: { array: ['string', 2] } });
        });
    });
});
