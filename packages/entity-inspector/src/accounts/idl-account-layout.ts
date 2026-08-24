// The wire shape of an account's byte layout: one flat row per layout entry, so a caller can say where
// a value lives without walking a tree. Values are deliberately absent — they are already in
// `decoded.info`, and repeating them doubles the reply to say nothing new.
import {
    type AccountDecode,
    flattenLayout,
    getDecodedLayout,
    IdlStandard,
    isIdlError,
    joinPath,
    type LayoutEntry,
    type LayoutNodeKind,
    type LayoutNumberFormat,
} from '@explorer/idl-decode';
import type { ReadonlyUint8Array } from '@solana/kit';

import { type InspectorLogger, ns } from '../logger.js';

/**
 * One entry of the layout — it occupies `[offset, offset + size)` of the account's raw data. Rows cover
 * named fields plus the container bodies and the container elements they nest in; an element that is
 * not a container stays a value on its array. `path` is the only identity a row has, and it is unique
 * across the layout.
 */
export type IdlLayoutField = {
    /** Dot path into `decoded.info` — `receipts.0.productName` for a field inside the first element of a vec. */
    path: string;
    offset: number;
    size: number;
    /** The schema node kind the entry resolved to, e.g. `publicKeyTypeNode`, `arrayTypeNode`. */
    kind: LayoutNodeKind;
    /** How the program declared a numeric field — `u64`, `i32`, … Present only on `numberTypeNode`. */
    format?: LayoutNumberFormat;
    /** The program's own doc comments; absent when the IDL declares none. */
    docs?: readonly string[];
};

export type IdlAccountLayout = {
    fields: readonly IdlLayoutField[];
    /** Rows past the cap. Present only when some were dropped, so a truncated reply never reads as complete. */
    omitted?: number;
};

// A nested-array account can name hundreds of fields (amm_v3's TickArrayState reaches ~500). The reply
// stays bounded, and `omitted` keeps the truncation visible rather than passing a prefix off as the
// whole. The kept rows are a depth-first prefix, so a big nested array early in the account can spend
// the cap and hide the account's own later fields; `omitted` is the only signal that happened.
const MAX_LAYOUT_FIELDS = 256;

/** What a failed layout names in the log — the account it was built for. */
type LayoutSubject = { address?: string; owner: string };

/**
 * Describe where each decoded field sat in the raw bytes. Best-effort by contract: the decoded payload
 * is the tool's answer, so a layout that cannot be built returns `undefined` and leaves that answer
 * intact. Only the codama arm carries a layout; any other arm returns `undefined` without a log, since
 * having no layout is that arm's normal outcome rather than a failure. A schema that names no field
 * returns `undefined` as well — an empty row list is no more use to a caller than no layout.
 */
export function describeIdlAccountLayout(
    decode: AccountDecode,
    data: ReadonlyUint8Array,
    logger: InspectorLogger,
    subject: LayoutSubject,
): IdlAccountLayout | undefined {
    if (decode.kind !== IdlStandard.Codama) return undefined;
    try {
        const layout = getDecodedLayout(decode, data);
        // the root entry spans the payload the schema read and names no field of its own
        const rows = flattenLayout(layout).filter(entry => entry.path.length > 0);
        if (rows.length === 0) return undefined;
        const fields = rows.slice(0, MAX_LAYOUT_FIELDS).map(toLayoutField);
        const omitted = rows.length - fields.length;
        return { fields, ...(omitted > 0 ? { omitted } : {}) };
    } catch (error) {
        const context = { ...subject, dataLength: data.length, error };
        // a typed IdlError is a layout this schema cannot describe; anything else is a bug in the walk
        if (isIdlError(error)) logger.warn(ns('idl account layout failed'), context);
        else logger.error(ns('idl account layout crashed'), context);
        return undefined;
    }
}

function toLayoutField(entry: LayoutEntry): IdlLayoutField {
    return {
        kind: entry.node.kind,
        offset: entry.offset,
        path: joinPath(entry.path),
        size: entry.size,
        ...(entry.node.kind === 'numberTypeNode' ? { format: entry.node.format } : {}),
        ...(entry.docs.length > 0 ? { docs: entry.docs } : {}),
    };
}
