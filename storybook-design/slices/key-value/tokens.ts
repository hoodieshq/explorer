// Type + baseline tokens for the Label / KeyValue primitives.
//
// The idea (see the `BaselineGrid` story): every Label keeps its own *tight* line-height
// but is padded top/bottom so its box fills a standardized line-box height (20 / 24 / 32)
// AND its text baseline lands on that line-box's shared baseline. The padding is asymmetric
// on purpose — a symmetric pad would center the glyph; the extra weight on top drops the
// baseline down onto the grid so a small label sits on the same baseline as larger body text.

export type LabelSize = 's' | 'm' | 'l' | 'xl';
export type LineBox = 16 | 20 | 24 | 32 | 36 | 40;

// Font sizes are the existing dashkit tokens (px); line-heights are the tight per-size box.
//   s → dk-xs (10px),  m → dk-sm (13px),  l → dk-base (15px),  xl → dk-lg (17px)
// (Source line-height for all of these as body text is 1.5; we override to a tighter box
// so the shim can standardize the row — see the table in tokens comments / chat.)
export const LABEL_FONT: Record<LabelSize, { fontSize: number; lineHeight: number }> = {
    s: { fontSize: 10, lineHeight: 14 },
    m: { fontSize: 13, lineHeight: 16 },
    l: { fontSize: 15, lineHeight: 20 },
    xl: { fontSize: 17, lineHeight: 24 },
};

// [paddingTop, paddingBottom] per (size × line-box). Invariant: pt + lineHeight + pb === lineBox.
// Starting values computed at ascent≈0.8, anchored to the `l` baseline — verify/tune against
// Rubik in the `BaselineGrid` story and nudge ±1px there. All entries below satisfy the invariant.
// Inner map is Partial: a size only lists line-boxes it fits (line-box must be ≥ its line-height).
//   line-box 16 → s (14) and m (16) fit; l/xl are omitted.
export const LABEL_SHIM: Record<LabelSize, Partial<Record<LineBox, [number, number]>>> = {
    // xl (17/24) is larger than the `l` anchor, so its baseline shifts *up* (less top padding).
    xl: { 24: [0, 0], 32: [3, 5], 36: [5, 7], 40: [7, 9] },
    l: { 20: [0, 0], 24: [2, 2], 32: [6, 6], 36: [8, 8], 40: [10, 10] },
    m: { 16: [0, 0], 20: [3, 1], 24: [5, 3], 32: [9, 7], 36: [11, 9], 40: [13, 11] },
    s: { 16: [2, 0], 20: [5, 1], 24: [7, 3], 32: [11, 7], 36: [13, 9], 40: [15, 11] },
};

// --- Icon tokens ---------------------------------------------------------------
// A label may carry an icon (a help/link/status glyph). The icon gets its own wrapper
// (see Icon.tsx) that is the exact parallel of Label: it fills the same standardized
// line-box and is positioned *once* here so any icon dropped beside a label lines up.

// Icon edge length (px) per label size. Even numbers render crisper for react-feather;
// each is ~1 step above the label font so the icon reads at roughly the cap height.
//   s → 12,  m → 14,  l → 16,  xl → 18
export const ICON_SIZE: Record<LabelSize, number> = {
    s: 12,
    m: 14,
    l: 16,
    xl: 18,
};

// [paddingTop, paddingBottom] per (size × line-box) for the icon box.
// Invariant: pt + ICON_SIZE[size] + pb === lineBox (the box fills the line-box, like Label).
// Unlike a glyph, an icon has no baseline — so the padding is asymmetric to drop the icon's
// *optical center* onto the label text's optical center (baseline − capHeight/2) within the
// same line-box, i.e. an icon and a same-size Label sit on one grid. Starting values computed
// at ascent≈0.8, capHeight≈0.7; verify/tune in the `Icon` grid story exactly as with LABEL_SHIM.
// Same Partial rule: a size only lists line-boxes whose box is ≥ its icon size.
export const ICON_SHIM: Record<LabelSize, Partial<Record<LineBox, [number, number]>>> = {
    xl: { 24: [2, 4], 32: [6, 8], 36: [8, 10], 40: [10, 12] },
    l: { 20: [1, 3], 24: [3, 5], 32: [7, 9], 36: [9, 11], 40: [11, 13] },
    m: { 16: [0, 2], 20: [3, 3], 24: [5, 5], 32: [9, 9], 36: [11, 11], 40: [13, 13] },
    s: { 16: [3, 1], 20: [5, 3], 24: [7, 5], 32: [11, 9], 36: [13, 11], 40: [15, 13] },
};
