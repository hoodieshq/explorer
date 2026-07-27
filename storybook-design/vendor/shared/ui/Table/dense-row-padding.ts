// Dense row spacing for card tables: 12px horizontal / 8px vertical padding on every cell, with
// content top-aligned. `!` beats BaseTable's default `p-4`, its edge `pl-6`/`pr-6`, and
// `align-middle` — cn keeps all classes, so important wins regardless of stylesheet order. Pass
// through the table's `className`.
//
// Vendored: upstream this belongs next to BaseTable (app/shared/ui/Table/BaseTable.tsx) and would be
// re-exported from its barrel; kept here so the slice needs no changes outside storybook-design/.
export const DENSE_ROW_PADDING =
    '[&_th]:!px-3 [&_th]:!py-2 [&_th]:!align-top [&_td]:!px-3 [&_td]:!py-2 [&_td]:!align-top';
