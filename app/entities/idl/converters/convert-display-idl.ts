import { IdlType, IdlTypeDefined } from '@coral-xyz/anchor/dist/cjs/idl';

import type { IdlSpec, LegacyIdlType, TupleType } from '../converters/convert-legacy-idl';
import {
    convertLegacyIdl as convertDisplayIdl,
    convertType as convertLegacyType,
    internalConvertDefinedTypeArg as convertDefinedTypeArg,
} from '../converters/convert-legacy-idl';

export type DisplayIdlSpecKey = IdlSpec | 'legacy-shank';

export type DisplayIdlType = LegacyIdlType | { tuple: TupleType } | { option: { tuple: TupleType } };

type ShankIdlType = { tuple: TupleType };

export type LegacyOrShankIdlType = LegacyIdlType | ShankIdlType;

function convertType(type: LegacyOrShankIdlType): IdlType {
    if (typeof type === 'string') {
        return type === 'publicKey' ? 'pubkey' : type;
    } else if ('vec' in type) {
        return { vec: convertType(type.vec) };
    } else if ('option' in type) {
        return { option: convertType(type.option) };
    } else if ('defined' in type) {
        return { defined: { generics: [], name: type.defined } } as IdlTypeDefined;
    } else if ('array' in type) {
        return { array: [convertType(type.array[0]), type.array[1]] };
    } else if ('generic' in type) {
        return type;
    } else if ('definedWithTypeArgs' in type) {
        return {
            defined: {
                generics: type.definedWithTypeArgs.args.map(convertDefinedTypeArg),
                name: type.definedWithTypeArgs.name,
            },
        } as IdlTypeDefined;
    } else if ('tuple' in type) {
        // Use generic type to display tuple as it is not covered by IdlType
        return {
            defined: {
                generics: type.tuple.map(t => ({ kind: 'type', type: convertType(t) })),
                name: `tuple[${type.tuple[0]}]`,
            },
        };
    }
    throw new Error(`Unsupported type: ${JSON.stringify(type)}`);
}

export { convertDisplayIdl, convertType };
