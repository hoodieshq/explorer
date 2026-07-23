// ---------------------------------------------------------------------------
// Inline-icon grid — placing an icon INSIDE a line of KeyLabel text so it reads
// like a glyph: same baseline, wraps with the words, never drags the line's
// vertical rhythm around.
// ---------------------------------------------------------------------------
//
// Unlike the multi-primitive vgrid (which wraps flex "cubes" and pads them to a
// row height R), this is a genuine INLINE placement. The icon lives in an
// inline-block "slot" the height of the text's line-box; the icon itself is
// centred in that slot and can overflow it, nudged onto the baseline by eye.
//
// Model, keyed by KeyLabel size (xs…4xl), values in `em` (relative to that
// size's font-size — so they scale with the text like a real glyph):
//   • `size`  — the icon's side length, in em. `1.15em` renders slightly larger
//     than the cap height, like an inline symbol.
//   • `nudge` — vertical offset of the centred icon, in em. Positive = down.
//     Tuned per size because the scale's line-height / font-size ratio isn't
//     constant, so the optical baseline sits at a different fraction each size.
//
// The context (font-size + line-height) is NOT stored here — it comes from the
// KeyLabel type scale (`LABEL_SIZES`). The editor tunes in px and converts at
// its boundary via the per-size font-size (`emToPx` / `pxToEm`).

import { labelSize, type LabelSizeName } from './key-label-vgrid';
import { LABEL_SIZE_NAMES } from './primitives-vgrid';

/** One tuned inline-icon cell. Both values in `em` (relative to the size's font-size). */
export interface IconCell {
    /** Icon side length, in em. */
    size: number;
    /** Vertical nudge of the centred icon, in em (positive = down). */
    nudge: number;
}

/** The whole grid: one cell per KeyLabel size. */
export type InlineIconGrid = Record<LabelSizeName, IconCell>;

// ---------------------------------------------------------------------------
// Size context (from the KeyLabel scale) + px ↔ em (relative to a size's font-size)
// ---------------------------------------------------------------------------

/** The font-size (px) of a KeyLabel size — the base `em` is measured against. */
export const fontSizeOf = (name: LabelSizeName): number => labelSize(name).fontSize;
/** The intrinsic line-box height (px) of a KeyLabel size — the icon slot's height. */
export const lineHeightOf = (name: LabelSizeName): number => labelSize(name).lineHeight;

/** em → px for a given size (`px = em * font-size`). */
export const emToPx = (em: number, name: LabelSizeName): number => em * fontSizeOf(name);
/** px → em for a given size (`em = px / font-size`). */
export const pxToEm = (px: number, name: LabelSizeName): number => px / fontSizeOf(name);

// ---------------------------------------------------------------------------
// Committed grid — hand-tuned in the Playground editor, baked in via "Copy TS".
// ---------------------------------------------------------------------------

/* eslint-disable sort-keys-fix/sort-keys-fix */
export const INLINE_ICON_GRID: InlineIconGrid = {
    xs: { size: 1.15, nudge: 0 },
    sm: { size: 1.15, nudge: 0 },
    base: { size: 1.15, nudge: 0 },
    lg: { size: 1.15, nudge: 0 },
    xl: { size: 1.15, nudge: 0 },
    '2xl': { size: 1.15, nudge: 0 },
    '3xl': { size: 1.15, nudge: 0 },
    '4xl': { size: 1.15, nudge: 0 },
};
/* eslint-enable sort-keys-fix/sort-keys-fix */

/** Seed a fresh (session) working copy from the committed grid (independent cells,
 *  so editor tweaks never mutate the committed constant). */
/* eslint-disable sort-keys-fix/sort-keys-fix */
export function seedInlineIconGrid(): InlineIconGrid {
    return {
        xs: { ...INLINE_ICON_GRID.xs },
        sm: { ...INLINE_ICON_GRID.sm },
        base: { ...INLINE_ICON_GRID.base },
        lg: { ...INLINE_ICON_GRID.lg },
        xl: { ...INLINE_ICON_GRID.xl },
        '2xl': { ...INLINE_ICON_GRID['2xl'] },
        '3xl': { ...INLINE_ICON_GRID['3xl'] },
        '4xl': { ...INLINE_ICON_GRID['4xl'] },
    };
}
/* eslint-enable sort-keys-fix/sort-keys-fix */

// ---------------------------------------------------------------------------
// Export (Copy TS / Copy prompt)
// ---------------------------------------------------------------------------

/** Quote size names that aren't valid identifiers (start with a digit, e.g. `2xl`). */
const quoteKey = (k: string): string => ('0123456789'.includes(k[0]) ? `'${k}'` : k);

/** Serialise the grid as the `INLINE_ICON_GRID` literal (em), ready to paste back. */
export function inlineIconToTs(grid: InlineIconGrid): string {
    const num = (n: number) => Number(n.toFixed(4));
    const rows = LABEL_SIZE_NAMES.map(name => {
        const c = grid[name];
        return `    ${quoteKey(name)}: { size: ${num(c.size)}, nudge: ${num(c.nudge)} },`;
    });
    return `export const INLINE_ICON_GRID: InlineIconGrid = {\n${rows.join('\n')}\n};`;
}

/** The same values wrapped in an instruction to bake them into the source. */
export function inlineIconToPrompt(grid: InlineIconGrid): string {
    return (
        `Bake these hand-tuned inline-icon values into ` +
        `storybook-design/slices/label/inline-icon-vgrid.ts by replacing the ` +
        `INLINE_ICON_GRID literal. Values are in em; change nothing else.\n\n${inlineIconToTs(grid)}`
    );
}
