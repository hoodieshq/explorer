// ---------------------------------------------------------------------------
// KeyLabel vertical-rhythm grid — the source of truth.
// ---------------------------------------------------------------------------
//
// A reusable, JS-free system for placing a label into a row of a given vertical
// rhythm and having its baseline land on that row's shared baseline. The idea
// generalises to every primitive later (tags, switches, icon-buttons) so that
// pieces tuned independently still snap together like Lego in one wrapping row.
//
// The model (agreed conventions):
//
//  • A ROW has a vertical size R (px) — a rhythm unit from `ROW_SIZES`. R is not
//    imposed on any container: it lives in the cubes. Each cube pads its own box
//    to exactly R tall, so a row of cubes is R tall and the container is free to
//    hug its content in height and stretch/hug in width.
//
//  • A CUBE (here, a KeyLabel of some size) has an intrinsic line-box height L.
//    It fits a row iff L <= R. To sit in the row it adds vertical padding:
//    `pt + L + pb = R`. Strategy B — the baseline is baked into `pt`, and rows
//    align to the TOP (`flex-start`), so a foreign element in the row can't drag
//    the cubes' alignment around.
//
//  • The BASELINE b(R) is a spec value tuned by eye: the shared line (px from the
//    row's top) that every cube's baseline lands on. It is what makes different
//    sizes in one row read as sitting on the same ruling.
//
// Applied with zero runtime JS via `vgridCss()`: a row declares
// `data-vgrid-row="R"`, each cube declares `data-vgrid-size="<name>"` (KeyLabel's
// `size` prop stamps it), and the generated CSS supplies `pt`/`pb` by cascade.
//
// UNITS. Everything that reaches the DOM is emitted in `rem` (font-size,
// line-height, padding), like Tailwind — so the grid scales with the user's
// browser base-font-size and the vertical alignment does NOT drift (R, L, pt, pb
// all scale by the same factor, keeping `pt + L + pb = R`). The stored grid
// values (`pt`/`pb`/`baseline`) are therefore in `rem` too. The editor is tuned
// in `px` and converts at its own boundary; because 1px = 0.0625rem (16 = 2⁴) the
// px↔rem round-trip is exact, with no accumulating error. `ROW_SIZES` stay px:
// they are row *identifiers* (`data-vgrid-row="24"`), never emitted as a length.

// ---------------------------------------------------------------------------
// Scale + rhythm axes
// ---------------------------------------------------------------------------

/** A label size on the Tailwind type scale: the `text-` name, its font size, and
 *  its intrinsic line-box height L (px) — the height glyphs occupy before any
 *  vertical-grid padding. A size fits a row R iff `lineHeight <= R`. */
export interface LabelSize {
    name: string;
    fontSize: number;
    lineHeight: number;
}

// The Tailwind font-size scale, ascending, in px. These px are the tuning/
// reference unit; KeyLabel ships them as `rem`. `base` (22) and `lg` (26)
// intentionally override Tailwind's defaults (24 / 28) — a tighter, monotonic
// progression that also de-duplicates lg vs xl. Capped at `4xl`: sizes with a
// line-height above the tallest row (max `ROW_SIZES` = 40) can never fit a row.
export const LABEL_SIZES = [
    { fontSize: 12, lineHeight: 16, name: 'xs' },
    { fontSize: 14, lineHeight: 20, name: 'sm' },
    { fontSize: 16, lineHeight: 22, name: 'base' },
    { fontSize: 18, lineHeight: 26, name: 'lg' },
    { fontSize: 20, lineHeight: 28, name: 'xl' },
    { fontSize: 24, lineHeight: 32, name: '2xl' },
    { fontSize: 30, lineHeight: 36, name: '3xl' },
    { fontSize: 36, lineHeight: 40, name: '4xl' },
] as const satisfies readonly LabelSize[];

/** A single scale entry with its literal `name` preserved (unlike the widened `LabelSize`). */
export type Size = (typeof LABEL_SIZES)[number];
export type LabelSizeName = Size['name'];

/** Display-only: the FULL Tailwind type scale, shown as a reference next to the
 *  matrix. Extends the tunable `LABEL_SIZES` with the larger sizes (`5xl`+) that
 *  don't fit any row — they can't be tuned, but stay visible as a reference. */
export const REFERENCE_SIZES = [
    ...LABEL_SIZES,
    { fontSize: 48, lineHeight: 48, name: '5xl' },
    { fontSize: 60, lineHeight: 60, name: '6xl' },
    { fontSize: 72, lineHeight: 72, name: '7xl' },
    { fontSize: 96, lineHeight: 96, name: '8xl' },
    { fontSize: 128, lineHeight: 128, name: '9xl' },
] as const satisfies readonly LabelSize[];

/** The vertical rhythm units — row heights R (px). */
export const ROW_SIZES = [16, 20, 24, 28, 32, 36, 40] as const;
export type RowSize = (typeof ROW_SIZES)[number];

// ---------------------------------------------------------------------------
// px ↔ rem (exact: 16 = 2⁴, so 1px = 0.0625rem, no rounding)
// ---------------------------------------------------------------------------

/** Root font-size the whole scale is anchored to (browser default; not overridden). */
export const REM_BASE = 16;
export const pxToRem = (px: number): number => px / REM_BASE;
export const remToPx = (rem: number): number => rem * REM_BASE;
/** Format a rem number for CSS/TS output, trimming to the ≤4 exact decimals. */
export const remStr = (rem: number): string => `${Number(rem.toFixed(4))}rem`;

/** Look up a size by name. */
export function labelSize(name: LabelSizeName): Size {
    const found = LABEL_SIZES.find(s => s.name === name);
    if (!found) throw new Error(`Unknown label size: ${name}`);
    return found;
}

/** The sizes that fit a given row (L <= R), ascending. */
export function sizesFitting(row: number): readonly Size[] {
    return LABEL_SIZES.filter(s => s.lineHeight <= row);
}

// ---------------------------------------------------------------------------
// Grid data
// ---------------------------------------------------------------------------

/** One tuned cell: the vertical padding that makes a label's box exactly R tall
 *  (`pt + L + pb = R`) and drops its baseline on the row's shared line. In `rem`. */
export interface Offset {
    pt: number;
    pb: number;
}

/** Per-row grid: the shared baseline b(R) (distance from the row's top, tuned by
 *  eye) plus the padding cell for each fitting size. All values in `rem`. */
export interface RowGrid {
    baseline: number;
    sizes: Partial<Record<LabelSizeName, Offset>>;
}

export type VGrid = Partial<Record<RowSize, RowGrid>>;

/** The committed grid, in `rem` — hand-tuned in the Playground editor and baked in
 *  via "Copy TS". The editor seeds its (session-persisted) px working copy from
 *  this; tuned values are exported back here. Kept in scale order (xs→4xl, pt
 *  before pb) so it reads as a tuning table — hence the local sort-keys exception. */
/* eslint-disable sort-keys-fix/sort-keys-fix */
export const KEY_LABEL_VGRID: VGrid = {
    // vertical size 16px · baseline 0.75rem (12px)
    16: { baseline: 0.75, sizes: { xs: { pt: 0, pb: 0 } } },
    // vertical size 20px · baseline 0.9375rem (15px)
    20: { baseline: 0.9375, sizes: { xs: { pt: 0.1875, pb: 0.0625 }, sm: { pt: 0, pb: 0 } } },
    // vertical size 24px · baseline 1.125rem (18px)
    24: { baseline: 1.125, sizes: { xs: { pt: 0.375, pb: 0.125 }, sm: { pt: 0.1875, pb: 0.0625 }, base: { pt: 0.0625, pb: 0.0625 } } },
    // vertical size 28px · baseline 1.3125rem (21px)
    28: { baseline: 1.3125, sizes: { xs: { pt: 0.5625, pb: 0.1875 }, sm: { pt: 0.375, pb: 0.125 }, base: { pt: 0.25, pb: 0.125 }, lg: { pt: 0.125, pb: 0 }, xl: { pt: 0, pb: 0 } } },
    // vertical size 32px · baseline 1.5rem (24px)
    32: { baseline: 1.5, sizes: { xs: { pt: 0.75, pb: 0.25 }, sm: { pt: 0.5625, pb: 0.1875 }, base: { pt: 0.4375, pb: 0.1875 }, lg: { pt: 0.3125, pb: 0.0625 }, xl: { pt: 0.1875, pb: 0.0625 }, '2xl': { pt: 0, pb: 0 } } },
    // vertical size 36px · baseline 1.75rem (28px)
    36: { baseline: 1.75, sizes: { xs: { pt: 1, pb: 0.25 }, sm: { pt: 0.8125, pb: 0.1875 }, base: { pt: 0.6875, pb: 0.1875 }, lg: { pt: 0.5625, pb: 0.0625 }, xl: { pt: 0.4375, pb: 0.0625 }, '2xl': { pt: 0.25, pb: 0 }, '3xl': { pt: 0, pb: 0 } } },
    // vertical size 40px · baseline 2rem (32px)
    40: { baseline: 2, sizes: { xs: { pt: 1.25, pb: 0.25 }, sm: { pt: 1.0625, pb: 0.1875 }, base: { pt: 0.9375, pb: 0.1875 }, lg: { pt: 0.8125, pb: 0.0625 }, xl: { pt: 0.6875, pb: 0.0625 }, '2xl': { pt: 0.5, pb: 0 }, '3xl': { pt: 0.25, pb: 0 }, '4xl': { pt: 0, pb: 0 } } },
};
/* eslint-enable sort-keys-fix/sort-keys-fix */

/** Re-unit a grid's values (keys/structure preserved). Used by the editor to work
 *  in px (`gridToPx`) and to serialise back to rem (`gridToRem`). */
function mapGrid(grid: VGrid, f: (n: number) => number): VGrid {
    const out: VGrid = {};
    for (const row of ROW_SIZES) {
        const entry = grid[row];
        if (!entry) continue;
        const sizes: RowGrid['sizes'] = {};
        for (const s of sizesFitting(row)) {
            const off = entry.sizes[s.name];
            if (off) sizes[s.name] = { pb: f(off.pb), pt: f(off.pt) };
        }
        out[row] = { baseline: f(entry.baseline), sizes };
    }
    return out;
}

/** rem grid → px grid (for the px-native editor). Exact for our 0.0625rem steps. */
export const gridToPx = (grid: VGrid): VGrid => mapGrid(grid, remToPx);
/** px grid → rem grid (for storage / CSS output). */
export const gridToRem = (grid: VGrid): VGrid => mapGrid(grid, pxToRem);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Build the runtime CSS: `[data-vgrid-row="R"] [data-vgrid-size="name"]` (a cube
 *  inside a row) plus the same-element form (a standalone cube that declares R on
 *  itself). Zero JS at runtime — the cascade supplies the padding. */
export function vgridCss(grid: VGrid = KEY_LABEL_VGRID): string {
    const rules: string[] = [];
    for (const row of ROW_SIZES) {
        const entry = grid[row];
        if (!entry) continue;
        for (const s of sizesFitting(row)) {
            const off = entry.sizes[s.name];
            if (!off) continue;
            const sel =
                `[data-vgrid-row="${row}"] [data-vgrid-size="${s.name}"],\n` +
                `[data-vgrid-row="${row}"][data-vgrid-size="${s.name}"]`;
            rules.push(`${sel} {\n    padding-top: ${remStr(off.pt)};\n    padding-bottom: ${remStr(off.pb)};\n}`);
        }
    }
    return rules.join('\n\n');
}

/** Serialise the grid as the `KEY_LABEL_VGRID` literal, grouped by R, each row
 *  annotated with its vertical size and baseline. Paste back into this file. */
export function vgridToTs(grid: VGrid = KEY_LABEL_VGRID): string {
    // The grid stores rem; round-trip via toFixed(4) to drop float noise (values are exact 0.0625 steps).
    const rem = (n: number) => Number(n.toFixed(4));
    const rows: string[] = [];
    for (const row of ROW_SIZES) {
        const entry = grid[row];
        if (!entry) continue;
        const cells = sizesFitting(row)
            .map(s => {
                const off = entry.sizes[s.name];
                // Quote names that aren't valid identifiers (start with a digit, e.g. `2xl`).
                const key = '0123456789'.includes(s.name[0]) ? `'${s.name}'` : s.name;
                return off ? `${key}: { pt: ${rem(off.pt)}, pb: ${rem(off.pb)} }` : undefined;
            })
            .filter(Boolean)
            .join(', ');
        rows.push(
            `    // vertical size ${row}px · baseline ${rem(entry.baseline)}rem (${Math.round(remToPx(entry.baseline))}px)\n` +
                `    ${row}: { baseline: ${rem(entry.baseline)}, sizes: { ${cells} } },`,
        );
    }
    return `export const KEY_LABEL_VGRID: VGrid = {\n${rows.join('\n')}\n};`;
}

/** A ready-to-send instruction (prompt + TS) to bake tuned values back into the
 *  source of truth. */
export function vgridToPrompt(grid: VGrid = KEY_LABEL_VGRID): string {
    return (
        `Bake these hand-tuned KeyLabel vertical-grid values into ` +
        `storybook-design/slices/label/key-label-vgrid.ts by replacing the ` +
        `KEY_LABEL_VGRID literal. Change nothing else — the CSS and the editor ` +
        `regenerate from it.\n\n${ 
        vgridToTs(grid)}`
    );
}
