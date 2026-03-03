import type { InstructionArgumentNode, RootNode, TypeNode } from 'codama';

/**
 * Convert a string value to the proper JS type based on a Codama TypeNode.
 */
export function convertValue(value: unknown, typeNode: TypeNode, root?: RootNode): unknown {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const str = typeof value === 'string' ? value : String(value);

    switch (typeNode.kind) {
        case 'numberTypeNode': {
            const { format } = typeNode;
            if (format === 'u64' || format === 'u128' || format === 'i64' || format === 'i128') {
                return BigInt(str);
            }
            return Number(str);
        }

        case 'booleanTypeNode':
            return str === 'true' || value === true;

        case 'publicKeyTypeNode':
            return str;

        case 'stringTypeNode':
            return str;

        case 'bytesTypeNode': {
            if (str.startsWith('[')) {
                return new Uint8Array(JSON.parse(str));
            }
            const bytes = new Uint8Array(str.length / 2);
            for (let i = 0; i < str.length; i += 2) {
                bytes[i / 2] = parseInt(str.substring(i, i + 2), 16);
            }
            return bytes;
        }

        case 'optionTypeNode':
        case 'remainderOptionTypeNode':
        case 'zeroableOptionTypeNode':
            if (str === '' || str === 'null' || str === 'none') {
                return null;
            }
            return convertValue(value, typeNode.item, root);

        case 'arrayTypeNode':
        case 'setTypeNode': {
            const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(parsed)) return [convertValue(parsed, typeNode.item, root)];
            return parsed.map(item => convertValue(item, typeNode.item, root));
        }

        case 'structTypeNode': {
            const obj: unknown = typeof value === 'string' ? JSON.parse(value) : value;
            if (typeof obj !== 'object' || obj === null) return obj;
            const result: Record<string, unknown> = {};
            for (const field of typeNode.fields) {
                const fieldValue = (obj as Record<string, unknown>)[field.name];
                result[field.name] = convertValue(fieldValue, field.type, root);
            }
            return result;
        }

        case 'enumTypeNode': {
            if (str.startsWith('{')) {
                return JSON.parse(str) as unknown;
            }
            return str;
        }

        case 'tupleTypeNode': {
            const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(parsed)) return parsed;
            return parsed.map((item, i) => {
                const itemType = typeNode.items[i];
                return itemType ? convertValue(item, itemType, root) : item;
            });
        }

        case 'definedTypeLinkNode': {
            if (!root) return value;
            const definedType = root.program.definedTypes.find(t => t.name === typeNode.name);
            if (!definedType) return value;
            return convertValue(value, definedType.type, root);
        }

        case 'fixedSizeTypeNode':
        case 'sizePrefixTypeNode':
        case 'postOffsetTypeNode':
        case 'preOffsetTypeNode':
        case 'sentinelTypeNode':
            return convertValue(value, typeNode.type, root);

        case 'solAmountTypeNode':
        case 'amountTypeNode':
        case 'dateTimeTypeNode':
            return convertValue(value, typeNode.number, root);

        case 'hiddenPrefixTypeNode':
        case 'hiddenSuffixTypeNode':
            return convertValue(value, typeNode.type, root);

        case 'mapTypeNode': {
            const mapObj = typeof value === 'string' ? JSON.parse(value) : value;
            return mapObj;
        }

        default:
            return value;
    }
}

/**
 * Get the non-omitted arguments from an instruction node.
 */
export function getUserFacingArguments(instructionNode: {
    arguments: InstructionArgumentNode[];
}): InstructionArgumentNode[] {
    return instructionNode.arguments.filter(arg => arg.defaultValueStrategy !== 'omitted');
}
