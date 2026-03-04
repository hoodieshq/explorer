import type { InstructionArgumentNode, RootNode, TypeNode } from 'codama';

type ConvertCtx = { value: unknown; str: string; root?: RootNode };
type Handler<T = TypeNode> = (ctx: ConvertCtx, node: T) => unknown;

/**
 * Convert a string value to the proper JS type based on a Codama TypeNode.
 */
export function convertValue(value: unknown, typeNode: TypeNode, root?: RootNode): unknown {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const str = typeof value === 'string' ? value : String(value);
    const handler = handlers[typeNode.kind];
    if (handler) return handler({ value, str, root }, typeNode);
    return value;
}

/**
 * Get the non-omitted arguments from an instruction node.
 */
export function getUserFacingArguments(instructionNode: {
    arguments: InstructionArgumentNode[];
}): InstructionArgumentNode[] {
    return instructionNode.arguments.filter(arg => arg.defaultValueStrategy !== 'omitted');
}

// ---------------------------------------------------------------------------
// Handler map & helpers
// ---------------------------------------------------------------------------

const handlers: Partial<Record<TypeNode['kind'], Handler>> = {
    numberTypeNode: convertNumber,
    booleanTypeNode: ({ str, value }) => str === 'true' || value === true,
    publicKeyTypeNode: ({ str }) => str,
    stringTypeNode: ({ str }) => str,
    bytesTypeNode: convertBytes,
    optionTypeNode: convertOption,
    remainderOptionTypeNode: convertOption,
    zeroableOptionTypeNode: convertOption,
    arrayTypeNode: convertArray,
    setTypeNode: convertArray,
    structTypeNode: convertStruct,
    enumTypeNode: convertEnum,
    tupleTypeNode: convertTuple,
    definedTypeLinkNode: convertDefinedTypeLink,
    mapTypeNode: convertMap,
    fixedSizeTypeNode: unwrapType,
    sizePrefixTypeNode: unwrapType,
    postOffsetTypeNode: unwrapType,
    preOffsetTypeNode: unwrapType,
    sentinelTypeNode: unwrapType,
    hiddenPrefixTypeNode: unwrapType,
    hiddenSuffixTypeNode: unwrapType,
    solAmountTypeNode: unwrapNumber,
    amountTypeNode: unwrapNumber,
    dateTimeTypeNode: unwrapNumber,
};

function convertNumber({ str }: ConvertCtx, typeNode: TypeNode) {
    const { format } = typeNode as { format: string };
    if (format === 'u64' || format === 'u128' || format === 'i64' || format === 'i128') {
        try {
            return BigInt(str);
        } catch {
            throw new Error(`Invalid integer value "${str}" for ${format}`);
        }
    }
    const num = Number(str);
    if (isNaN(num)) throw new Error(`Invalid number value "${str}" for ${format}`);
    return num;
}

function convertBytes({ str }: ConvertCtx) {
    if (str.startsWith('[')) {
        try {
            return new Uint8Array(JSON.parse(str));
        } catch {
            throw new Error(`Invalid bytes array: ${str}`);
        }
    }
    const bytes = new Uint8Array(str.length / 2);
    for (let i = 0; i < str.length; i += 2) {
        bytes[i / 2] = parseInt(str.substring(i, i + 2), 16);
    }
    return bytes;
}

function convertOption({ value, str, root }: ConvertCtx, typeNode: TypeNode) {
    if (str === '' || str === 'null' || str === 'none') return null;
    return convertValue(value, (typeNode as { item: TypeNode }).item, root);
}

function convertArray({ value, root }: ConvertCtx, typeNode: TypeNode) {
    const parsed =
        typeof value !== 'string'
            ? value
            : (() => {
                  try {
                      return JSON.parse(value);
                  } catch {
                      return value.split(',').map(s => s.trim());
                  }
              })();
    const item = (typeNode as { item: TypeNode }).item;
    if (!Array.isArray(parsed)) return [convertValue(parsed, item, root)];
    return parsed.map(v => convertValue(v, item, root));
}

function convertStruct({ value, str, root }: ConvertCtx, typeNode: TypeNode) {
    const obj = typeof value === 'string' ? parseJSON(str, 'struct') : value;
    if (typeof obj !== 'object' || obj === null) return obj;
    const result: Record<string, unknown> = {};
    for (const field of (typeNode as { fields: { name: string; type: TypeNode }[] }).fields) {
        const fieldValue = (obj as Record<string, unknown>)[field.name];
        result[field.name] = convertValue(fieldValue, field.type, root);
    }
    return result;
}

function convertEnum({ str }: ConvertCtx) {
    if (str.startsWith('{')) return parseJSON(str, 'enum');
    return str;
}

function convertTuple({ value, str, root }: ConvertCtx, typeNode: TypeNode) {
    const parsed = typeof value === 'string' ? parseJSON(str, 'tuple') : value;
    if (!Array.isArray(parsed)) return parsed;
    const items = (typeNode as { items: TypeNode[] }).items;
    return parsed.map((item, i) => {
        const itemType = items[i];
        return itemType ? convertValue(item, itemType, root) : item;
    });
}

function convertDefinedTypeLink({ value, root }: ConvertCtx, typeNode: TypeNode) {
    if (!root) return value;
    const name = (typeNode as { name: string }).name;
    const definedType = root.program.definedTypes.find(t => t.name === name);
    if (!definedType) return value;
    return convertValue(value, definedType.type, root);
}

function convertMap({ value, str }: ConvertCtx) {
    return typeof value === 'string' ? parseJSON(str, 'map') : value;
}

function unwrapType({ value, root }: ConvertCtx, typeNode: TypeNode) {
    return convertValue(value, (typeNode as { type: TypeNode }).type, root);
}

function unwrapNumber({ value, root }: ConvertCtx, typeNode: TypeNode) {
    return convertValue(value, (typeNode as { number: TypeNode }).number, root);
}

function parseJSON(str: string, label: string): unknown {
    try {
        return JSON.parse(str);
    } catch {
        throw new Error(`Invalid JSON for ${label}: ${str}`);
    }
}
