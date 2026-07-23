// ---------------------------------------------------------------------------
// Primitive vertical-rhythm grid — the multi-primitive extension of the KeyLabel
// vgrid used by the box-model playground.
// ---------------------------------------------------------------------------
//
// The KeyLabel editor tuned ONE primitive (`KEY_LABEL_VGRID`, keyed by row → size
// → pt/pb). This file generalises that to every base primitive the gallery cares
// about: keylabel, tag (Badge), address, button, skeleton, raw data.
//
// Model (unchanged from KeyLabel, see key-label-vgrid.ts):
//   • A ROW has a vertical size R (px). Each element pads its box to exactly R
//     tall — `pt + h + pb = R` — where `h` is the element's own (border-box)
//     height, measured at runtime. The baseline is baked into `pt` and rows
//     top-align (strategy B).
//   • To avoid breaking primitives that already carry their own padding (a Badge's
//     pill, a Button's chrome), the pt/pb live on a POSITIONING WRAPPER around the
//     primitive, never on the primitive itself.
//
// Offsets are keyed by (row, type, sizeKey). `sizeKey` is the axis that changes an
// element's box height within a row:
//   • keylabel / skeleton → the KeyLabel scale name (`xs`…`4xl`); both share ONE
//     table (a skeleton is a brick of height L, so KeyLabel's tuned pt/pb apply
//     verbatim — skeleton has no own table, it reads keylabel's).
//   • tag / button → the component's own `size` prop (distinct boxes per size).
//   • address / rawdata → a fixed scale name derived from their inner text size
//     (they expose no size prop).
//
// The baseline b(R) is a property of the ROW, shared by every type, so it lives in
// its own `ROW_BASELINES` map rather than being duplicated per type.

import { type LabelSizeName, type Offset, pxToRem, remStr, remToPx, ROW_SIZES, type RowSize } from './key-label-vgrid';

export type { Offset };

// ---------------------------------------------------------------------------
// Primitive types + palette metadata
// ---------------------------------------------------------------------------

export type PrimitiveType = 'keylabel' | 'tag' | 'address' | 'button' | 'skeleton' | 'rawdata';

/** Palette order (also the drag-source list shown in the right panel). */
export const PRIMITIVE_TYPES: readonly PrimitiveType[] = ['keylabel', 'tag', 'address', 'button', 'skeleton', 'rawdata'];

/** The KeyLabel type scale, as plain size-name options (ascending). */
export const LABEL_SIZE_NAMES: readonly LabelSizeName[] = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];

/** react-feather icon names offered for the tag/button icon slot. Rendered by the
 *  editor (this module stays data-only). `null` = no icon. */
export const ICON_OPTIONS: readonly string[] = ['Check', 'Copy', 'ExternalLink', 'Info', 'ChevronDown', 'Zap', 'AlertTriangle'];

/** Per-element configuration. Only the fields relevant to a type are ever read
 *  (see PRIMITIVE_META), but one flat shape keeps the instance list serialisable. */
export interface ElementConfig {
    /** Editable visible text (keylabel/tag/button label, address override text). */
    text?: string;
    /** Size token — meaning is type-specific (KeyLabel scale name, or Badge/Button size). */
    size?: string;
    /** Colour variant for tag/button. */
    variant?: string;
    /** react-feather icon name (tag/button); undefined = no icon. */
    icon?: string;
    /** Address: render as a link. */
    link?: boolean;
    /** Skeleton: explicit width in px (height comes from the size's line-box L). */
    width?: number;
}

/** One placed element in a row. `id` is stable for DnD + persistence. */
export interface ElementInstance {
    id: string;
    type: PrimitiveType;
    config: ElementConfig;
}

/** What the settings section exposes per type, plus the default config a fresh
 *  drop from the palette starts with. */
export interface PrimitiveMeta {
    label: string;
    /** size options offered (empty = no size control). */
    sizeOptions: readonly string[];
    /** colour variant options offered (empty = no variant control). */
    variantOptions: readonly string[];
    hasIcon: boolean;
    hasText: boolean;
    /** address-only `link` toggle. */
    hasLink: boolean;
    /** skeleton-only width control. */
    hasWidth: boolean;
    defaultConfig: ElementConfig;
}

export const PRIMITIVE_META: Record<PrimitiveType, PrimitiveMeta> = {
    address: {
        defaultConfig: { link: true, text: '' },
        hasIcon: false,
        hasLink: true,
        hasText: true,
        hasWidth: false,
        label: 'Address',
        sizeOptions: [],
        variantOptions: [],
    },
    button: {
        defaultConfig: { size: 'sm', text: 'Button', variant: 'outline' },
        hasIcon: true,
        hasLink: false,
        hasText: true,
        hasWidth: false,
        label: 'Button',
        sizeOptions: ['compact', 'sm', 'default', 'lg'],
        variantOptions: ['default', 'secondary', 'outline', 'ghost', 'accent', 'destructive', 'link'],
    },
    keylabel: {
        defaultConfig: { size: 'base', text: 'base' },
        hasIcon: false,
        hasLink: false,
        hasText: true,
        hasWidth: false,
        label: 'KeyLabel',
        sizeOptions: LABEL_SIZE_NAMES,
        variantOptions: [],
    },
    rawdata: {
        defaultConfig: {},
        hasIcon: false,
        hasLink: false,
        hasText: false,
        hasWidth: false,
        label: 'Raw data',
        sizeOptions: [],
        variantOptions: [],
    },
    skeleton: {
        defaultConfig: { size: 'base', width: 96 },
        hasIcon: false,
        hasLink: false,
        hasText: false,
        hasWidth: true,
        label: 'Skeleton',
        sizeOptions: LABEL_SIZE_NAMES,
        variantOptions: [],
    },
    tag: {
        defaultConfig: { size: 'xs', text: 'success', variant: 'success' },
        hasIcon: true,
        hasLink: false,
        hasText: true,
        hasWidth: false,
        label: 'Tag',
        sizeOptions: ['xs', 'sm', 'md', 'lg'],
        variantOptions: ['default', 'secondary', 'success', 'info', 'warning', 'destructive', 'transparent'],
    },
};

// ---------------------------------------------------------------------------
// Offset storage — one table per type, keyed by row → sizeKey → { pt, pb }
// ---------------------------------------------------------------------------

/** A type's tuned padding cells: row → sizeKey → offset. */
export type TypeGrid = Partial<Record<RowSize, Record<string, Offset>>>;

/** Every primitive's grid. `skeleton` has no own table — it reads `keylabel`. */
export type PrimitiveGrids = Record<Exclude<PrimitiveType, 'skeleton'>, TypeGrid>;

/** Which table a type's offsets live in (skeleton shares keylabel's). */
export function gridTypeOf(type: PrimitiveType): Exclude<PrimitiveType, 'skeleton'> {
    return type === 'skeleton' ? 'keylabel' : type;
}

/** The sizeKey used to index the offset table for an instance. */
export function sizeKeyOf(type: PrimitiveType, config: ElementConfig): string {
    switch (type) {
        case 'keylabel':
        case 'skeleton':
            return config.size ?? 'base';
        case 'tag':
            return config.size ?? 'xs';
        case 'button':
            return config.size ?? 'sm';
        case 'address':
            return 'sm'; // ~14px inner text → `sm` on the KeyLabel scale
        case 'rawdata':
            return 'xs'; // 12px monospace rows → `xs`
    }
}

// ---------------------------------------------------------------------------
// Committed grid — hand-tuned in the Playground editor and baked in (in `rem`).
// This is the multi-primitive source of truth: `seedGrids`/`seedBaselines` seed
// the editor's working (px) state from it, and the editor's "Copy TS"/"Copy prompt"
// re-emit exactly this shape. Replace these two literals to bake in a new tuning.
// ---------------------------------------------------------------------------

/* eslint-disable sort-keys-fix/sort-keys-fix -- rows ascend by size; cells read xs→4xl and pt-before-pb. */
export const PRIMITIVE_VGRIDS: PrimitiveGrids = {
    keylabel: {
        16: { xs: { pt: 0, pb: 0 } },
        20: { xs: { pt: 0.1875, pb: 0.0625 }, sm: { pt: 0, pb: 0 } },
        24: { xs: { pt: 0.375, pb: 0.125 }, sm: { pt: 0.1875, pb: 0.0625 }, base: { pt: 0.0625, pb: 0.0625 } },
        28: { xs: { pt: 0.5625, pb: 0.1875 }, sm: { pt: 0.375, pb: 0.125 }, base: { pt: 0.25, pb: 0.125 }, lg: { pt: 0.0625, pb: 0.0625 }, xl: { pt: 0, pb: 0 } },
        32: { xs: { pt: 0.75, pb: 0.25 }, sm: { pt: 0.5625, pb: 0.1875 }, base: { pt: 0.4375, pb: 0.1875 }, lg: { pt: 0.3125, pb: 0.0625 }, xl: { pt: 0.1875, pb: 0.0625 }, '2xl': { pt: 0, pb: 0 } },
        36: { xs: { pt: 1, pb: 0.25 }, sm: { pt: 0.8125, pb: 0.1875 }, base: { pt: 0.6875, pb: 0.1875 }, lg: { pt: 0.5625, pb: 0.0625 }, xl: { pt: 0.4375, pb: 0.0625 }, '2xl': { pt: 0.25, pb: 0 }, '3xl': { pt: 0, pb: 0 } },
        40: { xs: { pt: 1.25, pb: 0.25 }, sm: { pt: 1.0625, pb: 0.1875 }, base: { pt: 0.9375, pb: 0.1875 }, lg: { pt: 0.8125, pb: 0.0625 }, xl: { pt: 0.6875, pb: 0.0625 }, '2xl': { pt: 0.5, pb: 0 }, '3xl': { pt: 0.25, pb: 0 }, '4xl': { pt: 0, pb: 0 } },
    },
    tag: {
        24: { xs: { pt: 0.125, pb: 0.125 } },
        28: { xs: { pt: 0.3125, pb: 0.1875 }, sm: { pt: 0.1875, pb: 0.0625 } },
        32: { xs: { pt: 0.4375, pb: 0.3125 }, sm: { pt: 0.25, pb: 0.25 } },
        36: { xs: { pt: 0.5625, pb: 0.4375 }, sm: { pt: 0.375, pb: 0.375 }, md: { pt: 0.3125, pb: 0.25 } },
        40: { xs: { pt: 0.8125, pb: 0.4375 }, sm: { pt: 0.625, pb: 0.375 }, md: { pt: 0.5, pb: 0.3125 }, lg: { pt: 0.25, pb: 0.25 } },
    },
    address: {
        24: { sm: { pt: 0.0625, pb: 0 } },
        28: { sm: { pt: 0.25, pb: 0.0625 } },
        32: { sm: { pt: 0.4375, pb: 0.125 } },
        36: { sm: { pt: 0.6875, pb: 0.125 } },
        40: { sm: { pt: 0.9375, pb: 0.125 } },
    },
    button: {
        28: { compact: { pt: 0.125, pb: 0 }, sm: { pt: 0, pb: 0 } },
        32: { compact: { pt: 0.25, pb: 0.25 }, sm: { pt: 0.125, pb: 0.125 } },
        36: { compact: { pt: 0.4375, pb: 0.3125 }, sm: { pt: 0.25, pb: 0.25 } },
        40: { compact: { pt: 0.625, pb: 0.375 }, sm: { pt: 0.4375, pb: 0.3125 }, default: { pt: 0.125, pb: 0.125 } },
    },
    rawdata: {},
};

export const ROW_BASELINES: Record<number, number> = {
    16: 0.75,
    20: 0.9375,
    24: 1.125,
    28: 1.3125,
    32: 1.5,
    36: 1.75,
    40: 2,
};
/* eslint-enable sort-keys-fix/sort-keys-fix */

/** Convert a committed (rem) type grid to the editor's working px cells. */
function typeGridToPx(grid: TypeGrid): TypeGrid {
    const out: TypeGrid = {};
    for (const row of ROW_SIZES) {
        const cells = grid[row];
        if (!cells) continue;
        const px: Record<string, Offset> = {};
        for (const [k, off] of Object.entries(cells)) px[k] = { pb: Math.round(remToPx(off.pb)), pt: Math.round(remToPx(off.pt)) };
        out[row] = px;
    }
    return out;
}

/** Seed the working (px) grids from the committed PRIMITIVE_VGRIDS (skeleton shares keylabel). */
export function seedGrids(): PrimitiveGrids {
    return {
        address: typeGridToPx(PRIMITIVE_VGRIDS.address),
        button: typeGridToPx(PRIMITIVE_VGRIDS.button),
        keylabel: typeGridToPx(PRIMITIVE_VGRIDS.keylabel),
        rawdata: typeGridToPx(PRIMITIVE_VGRIDS.rawdata),
        tag: typeGridToPx(PRIMITIVE_VGRIDS.tag),
    };
}

/** Seed the per-row baselines (px) from the committed ROW_BASELINES. */
export function seedBaselines(): Partial<Record<RowSize, number>> {
    const out: Partial<Record<RowSize, number>> = {};
    for (const row of ROW_SIZES) {
        const b = ROW_BASELINES[row];
        out[row] = b != undefined ? Math.round(remToPx(b)) : Math.round(row * 0.75);
    }
    return out;
}

// ---------------------------------------------------------------------------
// Initial row contents (session seed)
// ---------------------------------------------------------------------------

let idCounter = 0;
/** A session-unique id for a placed element (base varies per load so a reload
 *  can't collide fresh drops with persisted ids). */
export function makeId(type: PrimitiveType): string {
    idCounter += 1;
    return `${type}-${idCounter}-${Math.round(performance.now())}`;
}

/** Which row a seeded element belongs to: a grid row size, or the freeform test line. */
export type SeedRowKey = RowSize | 'test';

/** A seeded element = type + config, WITHOUT an id (ids are minted fresh at seed
 *  time by `seedRowContents`, so a reload never collides with a persisted drop). */
export interface SeedElement {
    type: PrimitiveType;
    config: ElementConfig;
}

/** One seeded row: its key and the elements to place in it, in order. */
export interface SeedRow {
    row: SeedRowKey;
    elements: readonly SeedElement[];
}

/**
 * The STANDARD SCENE — the default element layout the gallery opens with (before
 * any session edits). This literal is the exportable source of truth: compose the
 * rows you want in the editor, then use its "Copy scene" button and paste the
 * result over this constant to make that arrangement the new default.
 *
 * The starting default: row i opens with a single KeyLabel of the first scale size
 * not used by a shorter row (16→xs, 20→sm, 24→base, …, 40→3xl).
 */
/* eslint-disable sort-keys-fix/sort-keys-fix -- read row-then-elements, type-then-config; this literal
   is also what "Copy scene" emits, so its key order must match the serialiser's. */
export const SEED_ROW_CONTENTS: readonly SeedRow[] = [
    { row: 16, elements: [
        { type: 'keylabel', config: { text: "xs", size: "xs" } },
        { type: 'skeleton', config: { size: "xs", width: 96 } },
    ] },
    { row: 20, elements: [
        { type: 'keylabel', config: { text: "sm", size: "sm" } },
        { type: 'tag', config: { text: "success", size: "xs", variant: "success" } },
        { type: 'skeleton', config: { size: "sm", width: 96 } },
    ] },
    { row: 24, elements: [
        { type: 'keylabel', config: { text: "base", size: "base" } },
        { type: 'tag', config: { text: "success", size: "xs", variant: "success" } },
        { type: 'address', config: { text: "", link: true } },
        { type: 'button', config: { text: "Button", size: "compact", variant: "outline" } },
        { type: 'skeleton', config: { size: "base", width: 96 } },
    ] },
    { row: 28, elements: [
        { type: 'keylabel', config: { text: "xl", size: "xl" } },
        { type: 'tag', config: { text: "success", size: "xs", variant: "success" } },
        { type: 'tag', config: { text: "success", size: "sm", variant: "success" } },
        { type: 'address', config: { text: "", link: true } },
        { type: 'button', config: { text: "Button", size: "compact", variant: "outline" } },
        { type: 'button', config: { text: "Button", size: "sm", variant: "outline" } },
        { type: 'skeleton', config: { size: "lg", width: 96 } },
    ] },
    { row: 32, elements: [
        { type: 'keylabel', config: { text: "2xl", size: "2xl" } },
        { type: 'tag', config: { text: "success", size: "xs", variant: "success" } },
        { type: 'tag', config: { text: "success", size: "sm", variant: "success" } },
        { type: 'address', config: { text: "", link: true } },
        { type: 'button', config: { text: "Button", size: "compact", variant: "outline" } },
        { type: 'button', config: { text: "Button", size: "sm", variant: "outline" } },
        { type: 'skeleton', config: { size: "xl", width: 96 } },
    ] },
    { row: 36, elements: [
        { type: 'keylabel', config: { text: "2xl", size: "2xl" } },
        { type: 'tag', config: { text: "success", size: "xs", variant: "success" } },
        { type: 'tag', config: { text: "success", size: "sm", variant: "success" } },
        { type: 'tag', config: { text: "success", size: "md", variant: "success" } },
        { type: 'address', config: { text: "", link: true } },
        { type: 'button', config: { text: "Button", size: "compact", variant: "outline" } },
        { type: 'button', config: { text: "Button", size: "sm", variant: "outline" } },
        { type: 'button', config: { text: "Button", size: "default", variant: "outline" } },
        { type: 'skeleton', config: { size: "2xl", width: 96 } },
    ] },
    { row: 40, elements: [
        { type: 'keylabel', config: { text: "3xl", size: "4xl" } },
        { type: 'tag', config: { text: "success", size: "xs", variant: "success" } },
        { type: 'tag', config: { text: "success", size: "sm", variant: "success" } },
        { type: 'tag', config: { text: "success", size: "md", variant: "success" } },
        { type: 'tag', config: { text: "success", size: "lg", variant: "success" } },
        { type: 'address', config: { text: "", link: true } },
        { type: 'button', config: { text: "Button", size: "compact", variant: "outline" } },
        { type: 'button', config: { text: "Button", size: "sm", variant: "outline" } },
        { type: 'button', config: { text: "Button", size: "default", variant: "outline" } },
    ] },
    { row: 'test', elements: [
        { type: 'keylabel', config: { text: "base", size: "base" } },
        { type: 'address', config: { text: "", link: true } },
        { type: 'tag', config: { text: "success", size: "xs", variant: "success" } },
        { type: 'button', config: { text: "Button", size: "compact", variant: "default" } },
    ] },
];
/* eslint-enable sort-keys-fix/sort-keys-fix */

/** Materialise a scene into live row contents, minting a fresh id per element (so a
 *  reload or an import never collides with an existing drop). */
export function sceneToRowContents(rows: readonly SeedRow[]): Partial<Record<SeedRowKey, ElementInstance[]>> {
    const out: Partial<Record<SeedRowKey, ElementInstance[]>> = {};
    for (const { row, elements } of rows) {
        out[row] = elements.map(el => ({ config: { ...el.config }, id: makeId(el.type), type: el.type }));
    }
    return out;
}

/** Build the initial (session-seed) row contents from the standard `SEED_ROW_CONTENTS`. */
export function seedRowContents(): Partial<Record<SeedRowKey, ElementInstance[]>> {
    return sceneToRowContents(SEED_ROW_CONTENTS);
}

// ---------------------------------------------------------------------------
// Export (Copy TS / Copy prompt) — the whole PRIMITIVE_VGRIDS at once
// ---------------------------------------------------------------------------

const quoteKey = (k: string): string => ('0123456789'.includes(k[0]) ? `'${k}'` : k);

/** Serialise the px working grids + baselines as a rem literal, ready to paste. */
export function gridsToTs(grids: PrimitiveGrids, baselines: Partial<Record<RowSize, number>>): string {
    const rem = (n: number) => Number(pxToRem(n).toFixed(4));
    const types = ['keylabel', 'tag', 'address', 'button', 'rawdata'] as const;
    const typeBlocks = types.map(type => {
        const grid = grids[type];
        const rows = ROW_SIZES.map(row => {
            const cells = grid[row];
            if (!cells || Object.keys(cells).length === 0) return undefined;
            const body = Object.entries(cells)
                .map(([k, off]) => `${quoteKey(k)}: { pt: ${rem(off.pt)}, pb: ${rem(off.pb)} }`)
                .join(', ');
            return `        ${row}: { ${body} },`;
        }).filter(Boolean);
        return `    ${type}: {\n${rows.join('\n')}\n    },`;
    });
    const baselineBody = ROW_SIZES.map(row => `    ${row}: ${rem(baselines[row] ?? Math.round(row * 0.75))},`).join('\n');
    return (
        `export const PRIMITIVE_VGRIDS: PrimitiveGrids = {\n${typeBlocks.join('\n')}\n};\n\n` +
        `export const ROW_BASELINES: Record<number, number> = {\n${baselineBody}\n};`
    );
}

/** The same values wrapped in an instruction to bake them in. */
export function gridsToPrompt(grids: PrimitiveGrids, baselines: Partial<Record<RowSize, number>>): string {
    return (
        `Bake these hand-tuned multi-primitive vertical-grid values into ` +
        `storybook-design/slices/label/primitives-vgrid.ts by replacing the ` +
        `PRIMITIVE_VGRIDS and ROW_BASELINES literals. Values are in rem; change ` +
        `nothing else.\n\n${gridsToTs(grids, baselines)}`
    );
}

// ---------------------------------------------------------------------------
// Scene export (Copy scene) — serialise the composed rows as SEED_ROW_CONTENTS
// ---------------------------------------------------------------------------

/** Stable field order for a serialised element config (only defined fields emit). */
const CONFIG_KEYS: readonly (keyof ElementConfig)[] = ['text', 'size', 'variant', 'icon', 'link', 'width'];

/** Serialise one element's config as a compact object literal (fixed key order). */
function configToLiteral(config: ElementConfig): string {
    const parts = CONFIG_KEYS.filter(k => config[k] !== undefined).map(k => `${k}: ${JSON.stringify(config[k])}`);
    return parts.length ? `{ ${parts.join(', ')} }` : '{}';
}

/**
 * Serialise the live composed rows as a `SEED_ROW_CONTENTS` literal, ready to paste
 * over the one in this file. Element ids are dropped (minted fresh at seed time);
 * only type + config survive. Rows emit in grid order, then the freeform `test`
 * line; empty rows are omitted (so they seed empty too).
 */
export function rowContentsToTs(rowContents: Partial<Record<SeedRowKey, ElementInstance[]>>): string {
    const rowKeys: readonly SeedRowKey[] = [...ROW_SIZES, 'test'];
    const blocks = rowKeys
        .map(row => {
            const els = rowContents[row];
            if (!els || els.length === 0) return undefined;
            const body = els.map(el => `        { type: '${el.type}', config: ${configToLiteral(el.config)} },`).join('\n');
            const key = row === 'test' ? "'test'" : String(row);
            return `    { row: ${key}, elements: [\n${body}\n    ] },`;
        })
        .filter(Boolean);
    return `export const SEED_ROW_CONTENTS: readonly SeedRow[] = [\n${blocks.join('\n')}\n];`;
}

/** The same scene wrapped in an instruction to bake it in as the default. */
export function rowContentsToPrompt(rowContents: Partial<Record<SeedRowKey, ElementInstance[]>>): string {
    return (
        `Make this the standard element seed for the primitives gallery: replace the ` +
        `SEED_ROW_CONTENTS literal in storybook-design/slices/label/primitives-vgrid.ts ` +
        `with the one below; change nothing else.\n\n${rowContentsToTs(rowContents)}`
    );
}

// ---------------------------------------------------------------------------
// Scene import (paste a copied seed) — parse SEED_ROW_CONTENTS text back to rows
// ---------------------------------------------------------------------------

/** Read a field off a possibly-object value without a type assertion (repo forbids `as`). */
function field(obj: unknown, key: string): unknown {
    return obj != undefined && typeof obj === 'object' && key in obj ? Reflect.get(obj, key) : undefined;
}

function isPrimitiveType(v: unknown): v is PrimitiveType {
    return typeof v === 'string' && PRIMITIVE_TYPES.some(t => t === v);
}

function isSeedRowKey(v: unknown): v is SeedRowKey {
    return v === 'test' || (typeof v === 'number' && ROW_SIZES.some(r => r === v));
}

/** Keep only the recognised, correctly-typed config fields (drops anything foreign). */
function sanitizeConfig(raw: unknown): ElementConfig {
    const cfg: ElementConfig = {};
    const text = field(raw, 'text');
    if (typeof text === 'string') cfg.text = text;
    const size = field(raw, 'size');
    if (typeof size === 'string') cfg.size = size;
    const variant = field(raw, 'variant');
    if (typeof variant === 'string') cfg.variant = variant;
    const icon = field(raw, 'icon');
    if (typeof icon === 'string') cfg.icon = icon;
    const link = field(raw, 'link');
    if (typeof link === 'boolean') cfg.link = link;
    const width = field(raw, 'width');
    if (typeof width === 'number') cfg.width = width;
    return cfg;
}

/**
 * Parse text produced by "Copy scene" (or "Copy scene prompt") back into a scene, so
 * a seed copied from someone else can be pasted in and rendered identically. The text
 * is a JS array literal (unquoted keys, single/double quotes, trailing commas), so it
 * is evaluated in isolation and then every field is validated — unknown types/rows and
 * foreign config fields are dropped, never trusted. Throws with a readable message if
 * no valid scene is found.
 */
export function parseScene(text: string): SeedRow[] {
    const eq = text.indexOf('=');
    const start = text.indexOf('[', eq >= 0 ? eq + 1 : 0);
    const end = text.lastIndexOf(']');
    if (start < 0 || end <= start) throw new Error('Could not find a scene array — paste the output of “Copy scene”.');
    const literal = text.slice(start, end + 1);
    let raw: unknown;
    try {
        raw = new Function(`return (${literal});`)();
    } catch {
        throw new Error('The pasted scene is not valid — copy it again with “Copy scene”.');
    }
    if (!Array.isArray(raw)) throw new Error('The pasted scene is not a list of rows.');
    const rows: SeedRow[] = [];
    for (const entry of raw) {
        const row = field(entry, 'row');
        const elements = field(entry, 'elements');
        if (!isSeedRowKey(row) || !Array.isArray(elements)) continue;
        const els: SeedElement[] = [];
        for (const el of elements) {
            const type = field(el, 'type');
            if (isPrimitiveType(type)) els.push({ config: sanitizeConfig(field(el, 'config')), type });
        }
        rows.push({ elements: els, row });
    }
    if (rows.length === 0) throw new Error('No recognisable rows in the pasted scene.');
    return rows;
}

/** Format a px offset as a rem CSS length (for the wrapper padding at runtime). */
export const offsetRem = (px: number): string => remStr(pxToRem(px));
