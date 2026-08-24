// The byte dimension `getDecodedEntries` cannot carry: where in the raw bytes each decoded field sat.
// Ranges come from the codec pipeline itself — every node's `read` is instrumented, so a range is what
// the decoder actually consumed. Recomputing the arithmetic would re-implement every size rule
// (prefixes, sentinels, offsets, fixed options). The copy would drift.
//
// Untested corner: `preOffsetTypeNode` and `postOffsetTypeNode` can move the read cursor backwards or
// to an absolute position. No fixture declares one, so a negative `size` is possible in principle here.
import { getNodeCodecVisitor } from '@codama/dynamic-codecs';
import type { Codec, ReadonlyUint8Array } from '@solana/kit';
import {
    type AccountNode,
    getLastNodeFromPath,
    getRecordLinkablesVisitor,
    type InstructionNode,
    interceptVisitor,
    isScalarEnum,
    LinkableDictionary,
    type Node,
    NodeStack,
    type NumberFormat,
    resolveNestedTypeNode,
    type StructFieldTypeNode,
    type TypeNode,
    visit,
} from 'codama';

import {
    IDL_ERROR__DECODE_KIND_MISMATCH,
    IDL_ERROR__LAYOUT_NOT_ANCHORABLE,
    IDL_ERROR__LAYOUT_WALK_FAILED,
    IdlError,
} from '../errors.js';
import {
    type AccountDecode,
    type CodamaDecodedAccount,
    type CodamaDecodedInstruction,
    IdlStandard,
    type InstructionDecode,
} from '../types.js';

/**
 * The container kinds that earn an entry of their own — the bodies fields and elements sit in. Derived
 * from {@link significantNode} so that switch stays the only place the set is declared.
 */
type LayoutContainerNode = Exclude<ReturnType<typeof significantNode>, StructFieldTypeNode | undefined>;

/** The node kinds a layout entry can resolve to — codama's own type-node vocabulary, never widened to `string`. */
export type LayoutNodeKind = TypeNode['kind'];

/** How a numeric field is serialised — codama's own wire formats (`u64`, `i32`, `f64`, …). */
export type LayoutNumberFormat = NumberFormat;

/**
 * One node of the byte layout — a named field, or a container body its fields and elements sit in.
 *
 * Entries exist for named fields and containers. Framing the codec reads but the schema does not name
 * never earns an entry of its own: length prefixes, enum discriminants, option tags, size wrappers.
 * Where the framed member has an entry, the framing is the gap between the parent's range and its
 * children's — a `Vec` field starting at 8 whose first element starts at 12 has its 4-byte count in
 * between. Where the framed member has none, the framing stays inside the entry's own range: a
 * size-prefixed string, an option of a scalar, and a scalar enum each report one range covering both
 * the framing and the value.
 *
 * Only a container earns an element entry. An array of scalars, pubkeys, strings or variant-only enums
 * is one entry whose `value` is the decoded array — 60 entries would repeat what one range and one
 * value already say — while an array of structs gives one entry per element.
 */
export type LayoutEntry = {
    /**
     * Member names, element indices, map keys, and an option's `value` from the payload root to this
     * entry — the way the decoded payload addresses it. Reading the decode along this path yields this
     * entry's `value`, and `joinPath` spells it the way `findEntry` accepts.
     */
    path: readonly (number | string)[];
    /** The struct field's name; absent on containers and on the root entry. */
    name?: string;
    /** The entry's resolved type node — size wrappers penetrated and defined-type links followed, the node `getDecodedEntries` would pair the same value with. */
    node: TypeNode;
    /** Doc comments the IDL carries for the field — the program's own Rust docs reach this far; `[]` when it declares none. */
    docs: readonly string[];
    /** Byte offset of the entry's first byte, from the start of the `data` passed in. */
    offset: number;
    /** Bytes the entry consumed — the range is `[offset, offset + size)`. */
    size: number;
    /** The decoded value at this entry, as the parser returned it. */
    value: unknown;
    /** Nested fields and container elements, in byte order; `[]` on a leaf. */
    children: readonly LayoutEntry[];
};

/**
 * Map the default (codama) arm's decode onto the bytes it came from — a tree of byte ranges paired
 * with the schema node, the decoded value, and the IDL's own docs. Pass the same `data` the decode
 * read. A non-codama arm throws the same typed kind-mismatch `IdlError` as `getDecodedEntries`, bytes
 * the decode cannot be replayed against throw `IDL_ERROR__LAYOUT_WALK_FAILED`, and a payload with no
 * container to anchor a range to throws `IDL_ERROR__LAYOUT_NOT_ANCHORABLE`.
 *
 * @example
 * ```ts
 * const layout = getDecodedLayout(client.decodeAccount(bytes), bytes);
 * layout.children.map(field => [field.name, field.offset, field.size]);
 * // [['discriminator', 0, 8], ['receipts', 8, 74], ['totalPurchases', 82, 8], …]
 * ```
 */
export function getDecodedLayout(decode: AccountDecode | InstructionDecode, data: ReadonlyUint8Array): LayoutEntry {
    if (decode.kind !== IdlStandard.Codama) {
        throw new IdlError(IDL_ERROR__DECODE_KIND_MISMATCH, { expected: IdlStandard.Codama, received: decode.kind });
    }
    const { kind, roots } = traceCodecReads(decode.decoded, data);
    const layout = roots.flatMap(root => toEntry(root, [])).at(0);
    // the engine reads a payload through one struct — an account's data, an instruction's synthesized
    // arguments — so no container means a schema with no field to anchor a range to
    if (!layout) {
        throw new IdlError(IDL_ERROR__LAYOUT_NOT_ANCHORABLE, { kind });
    }
    return layout;
}

/** Flatten a layout tree depth-first, parents before children — the shape `findEntry`-style lookups scan. */
export function flattenLayout(layout: LayoutEntry): LayoutEntry[] {
    return [layout, ...layout.children.flatMap(child => flattenLayout(child))];
}

/**
 * One `read` call, with the reads nested inside it. Nesting comes from the call itself, not from
 * comparing ranges: a zero-size read shares its sibling's offset, so range comparison would hand it to
 * the wrong parent.
 */
type TraceEntry = {
    node: Node;
    offset: number;
    size: number;
    value: unknown;
    /** Position among the parent's direct reads, framing and dropped reads included. */
    slot: number;
    /** Direct reads this node made, framing and dropped reads included. */
    reads: number;
    children: readonly TraceEntry[];
};

/** One in-flight read, collecting the reads its codec makes before it returns. */
type Frame = { children: TraceEntry[]; node: Node; reads: number };

/**
 * Replay the decode with every node's `read` instrumented. `roots` holds the outermost read — the only
 * one with no parent — and `kind` names the node it read through, for the error an unanchorable payload
 * throws. A failure before `kind` is assigned leaves through the catch, so its placeholder never
 * reaches a caller.
 */
function traceCodecReads(
    decoded: CodamaDecodedAccount | CodamaDecodedInstruction,
    data: ReadonlyUint8Array,
): { kind: string; roots: TraceEntry[] } {
    const roots: TraceEntry[] = [];
    let kind = 'unresolved';
    try {
        // narrow the envelope union first — TS cannot correlate path/node pairs across it (same as
        // `unwrap`). Both arms are identical on purpose; one call over the union does not typecheck.
        const entity: AccountNode | InstructionNode =
            'accounts' in decoded ? getLastNodeFromPath(decoded.path) : getLastNodeFromPath(decoded.path);
        const { path } = decoded;
        kind = entity.kind;

        const linkables = new LinkableDictionary();
        // Record from the path's head, exactly as `getNodeCodec` does — a decode's path is the one the
        // parser produced, so its head is the root the schema was identified in.
        visit(path[0], getRecordLinkablesVisitor(linkables));

        // The whole path seeds the stack, not the parent slice: link resolution reads the nearest node
        // of a kind off it, so the duplicated leaf is inert and the argument stays a typed NodePath.
        const stack = new NodeStack(path);
        const frames: Frame[] = [];
        const visitor = interceptVisitor(getNodeCodecVisitor(linkables, { stack }), (node, next) =>
            withReadTrace(node, next(node), frames, roots),
        );

        // `read`, not `decode`: kit builds `decode` over the codec's own `read`, closing over the
        // un-instrumented one, so the outermost node would never record its range.
        visit(entity, visitor).read(data, 0);
    } catch (cause) {
        throw new IdlError(IDL_ERROR__LAYOUT_WALK_FAILED, { cause, dataLength: data.length });
    }
    // the outermost read has no parent, so it is the one trace that lands here
    return { kind, roots };
}

function withReadTrace(node: Node, codec: Codec<unknown>, frames: Frame[], roots: TraceEntry[]): Codec<unknown> {
    return {
        ...codec,
        read(bytes, offset) {
            const frame: Frame = { children: [], node, reads: 0 };
            frames.push(frame);
            const [value, next] = codec.read(bytes, offset);
            frames.pop();

            const parent = frames.at(-1);
            const slot = parent ? parent.reads++ : 0;
            const trace: TraceEntry = {
                children: frame.children,
                node,
                offset,
                reads: frame.reads,
                size: next - offset,
                slot,
                value,
            };
            if (!parent) roots.push(trace);
            else if (keepsTrace(trace, parent.node)) parent.children.push(trace);
            return [value, next];
        },
    };
}

/**
 * Whether a finished read earns a place in the trace. A childless node that names nothing can produce
 * no entry and resolve no link, so dropping it here keeps the trace proportional to the schema's shape
 * instead of the payload's element count — a `[u8; 65536]` field reads 65_536 times and describes one
 * entry. Its slot is still spent, so an element's index survives the drop. A map's reads are the one
 * exception: a scalar key is the only path segment its value can carry.
 */
function keepsTrace(trace: TraceEntry, parent: Node): boolean {
    return (
        trace.children.length > 0 ||
        significantNode(trace.node) !== undefined ||
        trace.node.kind === 'definedTypeNode' ||
        parent.kind === 'mapTypeNode'
    );
}

// The return type is inferred on purpose: `LayoutContainerNode` reads it back, so the switch below is
// the one place the container set is written down.
function significantNode(node: Node) {
    switch (node.kind) {
        case 'arrayTypeNode':
        case 'mapTypeNode':
        case 'setTypeNode':
        case 'structFieldTypeNode':
        case 'structTypeNode':
        case 'tupleTypeNode':
            return node;
        case 'enumTypeNode':
            // A variant-only enum decodes to a leaf index, so one range and one value say everything an
            // element entry could — the same reason a `[u8; N]` element earns none. The engine's own
            // predicate, so the layout splits scalar from data enums exactly where the codec does.
            return isScalarEnum(node) ? undefined : node;
        default:
            return undefined;
    }
}

/**
 * The entries a single read contributes. A node the layout does not name — framing, a size wrapper, a
 * defined-type link, an enum variant — contributes its own children in its place, so its bytes stay
 * reachable and the path it sits on is unchanged.
 */
function toEntry(trace: TraceEntry, path: readonly (number | string)[]): LayoutEntry[] {
    const node = significantNode(trace.node);
    if (!node) return childEntries(trace, path);
    if (node.kind === 'structFieldTypeNode') {
        const fieldPath = [...path, node.name];
        return [
            collapse({
                children: childEntries(trace, fieldPath),
                docs: node.docs ?? [],
                name: node.name,
                node: resolveFieldType(node, trace),
                offset: trace.offset,
                path: fieldPath,
                size: trace.size,
                value: trace.value,
            }),
        ];
    }
    return [
        collapse({
            children: childEntries(trace, path),
            docs: [],
            node,
            offset: trace.offset,
            path,
            size: trace.size,
            value: trace.value,
        }),
    ];
}

function childEntries(trace: TraceEntry, path: readonly (number | string)[]): LayoutEntry[] {
    return segmentedChildren(trace).flatMap(({ segment, trace: child }) =>
        toEntry(child, segment === undefined ? path : [...path, segment]),
    );
}

/**
 * Fold away a child that addresses the same value as its parent. A field and the container it holds
 * read the same bytes over the same path (`receipts` and its `arrayTypeNode`), as do an enum and the
 * variant body inside it, so keeping both would put an unnamed twin on every non-scalar path. The
 * parent wins — it carries the name and the docs — and the child's own children move up to it.
 */
function collapse(entry: LayoutEntry): LayoutEntry {
    return { ...entry, children: adopt(entry.children, entry.path) };
}

function adopt(children: readonly LayoutEntry[], path: readonly (number | string)[]): LayoutEntry[] {
    return children.flatMap(child => (samePath(child.path, path) ? adopt(child.children, path) : [child]));
}

function samePath(left: readonly (number | string)[], right: readonly (number | string)[]): boolean {
    return left.length === right.length && left.every((segment, index) => segment === right[index]);
}

/** A direct read, with the path segment its parent's decoded value addresses it by. */
type SegmentedChild = { segment?: number | string; trace: TraceEntry };

/**
 * How each direct read is addressed inside its parent's decoded value. A container's members start
 * after the reads its own count spends, so a member's read position is its position in the payload —
 * which is what keeps a member that produced no entry from shifting the ones that follow it.
 */
function segmentedChildren(parent: TraceEntry): SegmentedChild[] {
    const node = parent.node;
    switch (node.kind) {
        case 'arrayTypeNode':
        case 'setTypeNode':
        case 'tupleTypeNode': {
            const framing = countReads(node);
            return parent.children.map(trace => ({ segment: trace.slot - framing, trace }));
        }
        case 'mapTypeNode':
            return keyedChildren(parent, countReads(node));
        case 'optionTypeNode':
        case 'remainderOptionTypeNode':
        case 'zeroableOptionTypeNode':
            return optionChildren(parent);
        default:
            return parent.children.map(trace => ({ trace }));
    }
}

/**
 * Reads a container spends before its members. Only a prefixed count reads anything — the prefix codec
 * is a node, so it takes the container's first read slot — while a fixed or remainder count reads
 * nothing and a tuple has no count at all.
 */
function countReads(node: LayoutContainerNode): number {
    return 'count' in node && node.count.kind === 'prefixedCountNode' ? 1 : 0;
}

/**
 * A map reads key then value for each entry, so a value is addressed by the key read just before it —
 * the spelling `getDecodedEntries` uses, and the one the decoded map is keyed by.
 */
function keyedChildren(parent: TraceEntry, framing: number): SegmentedChild[] {
    const keys = new Map(parent.children.map(child => [child.slot, child.value]));
    return parent.children
        .filter(child => (child.slot - framing) % 2 === 1)
        .map(trace => ({ segment: String(keys.get(trace.slot - 1)), trace }));
}

/**
 * An option's payload is its last read — the tag before it is framing the schema does not name — and
 * the payload sits under `value` in the decoded option, so the path says so.
 *
 * A `None` needs no check here: kit decodes one through a unit decoder rather than the item's, whatever
 * the option's flavour, so a `None` makes no payload read and there is nothing to address.
 */
function optionChildren(parent: TraceEntry): SegmentedChild[] {
    return parent.children.filter(child => child.slot === parent.reads - 1).map(trace => ({ segment: 'value', trace }));
}

/**
 * The field's own type node, resolved the way codama resolved it to build the codec: a defined-type
 * link shows up in the trace as the `definedTypeNode` it pointed at, over the same bytes. Reading the
 * answer off the trace keeps this in step with the engine — a second link lookup of our own could
 * resolve differently, and the disagreement would land on exactly the layouts a byte inspector exists
 * to explain. The walk stops at the first node that owns a value: descending past a single-member
 * container would report the member's type as the field's.
 */
function resolveFieldType(field: StructFieldTypeNode, trace: TraceEntry): TypeNode {
    for (let inner = onlySpanningChild(trace); inner; inner = onlySpanningChild(inner)) {
        if (inner.node.kind === 'definedTypeNode') return resolveNestedTypeNode(inner.node.type);
        if (significantNode(inner.node)) break;
    }
    // no link on the way down — penetrate the field's own size wrappers, as `getDecodedEntries` does
    return resolveNestedTypeNode(field.type);
}

/** The one child that read exactly the parent's bytes — a size wrapper, a link, or a sole member. */
function onlySpanningChild(trace: TraceEntry): TraceEntry | undefined {
    if (trace.children.length !== 1) return undefined;
    const [only] = trace.children;
    return only.offset === trace.offset && only.size === trace.size ? only : undefined;
}
