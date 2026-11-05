'use client';

import { useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// REVIEW(HOO-935): the design menu's configurator for an open extension, for tuning it in review; remove with the
// menu before the external PR and keep only the values the team settles on. The two designs compared first
// (`EXTENSION_FIELDS_PRESETS`) are only starting points now: the menu shows the presets saved in it.
//
// 1. `gap`: the space between two pairs, in px. With dividers on, the divider sits in the middle of it.
// 2. `indent`: how far the fields' text sits in from the open part's 12px line, in px (12 puts it 24px from the
//    edge). The left border needs room after its line, so with `border: 'left'` it never drops to 0; the full frame
//    of `border: 'all'` sits on the 12px line and takes none (`effectiveIndent`).
// 3. `border`: `left` is a 1px line down the fields' left side with square ends; `all` frames them with rounded
//    corners, and the pairs get 12px of side padding inside the frame.
// 4. `dividers`: a horizontal line between pairs.
// 5. `space`: the distance from the fields to what sits above and below them (the row, the buttons, the end of the
//    open part), in px. The left border's line runs 8px past the first and last pair either way.
// 6. `indentActions`: whether the indent moves Raw and Docs over the open fields too, so they start on the fields'
//    line. With `border: 'all'` only the fields' frame takes no indent, so neither do the buttons.
// 7. `inner`: with `border: 'all'` only, the padding inside the frame above the first pair and below the last, in px.
// 8. `placement`: where Raw and Docs sit on desktop. `above` / `below` put them in a line before / after the open
//    fields; `column` gives them two columns of their own in the extensions table, on every row. The phone drawer
//    keeps them in its footer either way.
// 9. `actionsBottom`: with `placement: 'below'` only, the space under the buttons before the next record, in px.
export const EXTENSION_FIELDS_GAPS = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '20', '24', '28'] as const;
export type ExtensionFieldsGap = (typeof EXTENSION_FIELDS_GAPS)[number];
export const EXTENSION_FIELDS_INDENTS = ['0', '4', '8', '12', '16', '20', '24', '32', '40'] as const;
export type ExtensionFieldsIndent = (typeof EXTENSION_FIELDS_INDENTS)[number];
export const EXTENSION_FIELDS_SPACES = ['8', '12', '16', '20', '24', '28', '32', '40', '48'] as const;
export type ExtensionFieldsSpace = (typeof EXTENSION_FIELDS_SPACES)[number];
export const EXTENSION_FIELDS_INNER_PADDINGS = ['0', '4', '6', '8', '10', '12', '16', '20', '24'] as const;
export type ExtensionFieldsInner = (typeof EXTENSION_FIELDS_INNER_PADDINGS)[number];
// The indent the left border falls back to when it is switched on over a 0 indent.
export const LEFT_BORDER_DEFAULT_INDENT: ExtensionFieldsIndent = '12';
export const EXTENSION_ACTIONS_BOTTOMS = ['16', '24', '32', '40', '48', '56', '64'] as const;
export type ExtensionActionsBottom = (typeof EXTENSION_ACTIONS_BOTTOMS)[number];
export type ExtensionFieldsBorder = 'none' | 'left' | 'all';
export type ExtensionActionsPlacement = 'above' | 'below' | 'column';

export type ExtensionFieldsLook = {
    border: ExtensionFieldsBorder;
    dividers: boolean;
    gap: ExtensionFieldsGap;
    indent: ExtensionFieldsIndent;
    inner: ExtensionFieldsInner;
    space: ExtensionFieldsSpace;
    indentActions: boolean;
};

// Key-value: the Accounts card's flat list (6px between pairs) behind a line on the row's 12px line. Table: the pairs
// framed and divided, 20px apart like `KeyValue`'s `comfortable` rows (`py-2.5`), with that 10px half gap inside the
// frame too, on the 12px line. Both keep 24px around the fields.
export const EXTENSION_FIELDS_PRESETS = {
    'key-value': {
        border: 'left',
        dividers: false,
        gap: '6',
        indent: '12',
        indentActions: false,
        inner: '10',
        space: '24',
    },
    table: { border: 'all', dividers: true, gap: '20', indent: '0', indentActions: false, inner: '10', space: '24' },
} as const satisfies Record<string, ExtensionFieldsLook>;
export type ExtensionFieldsPreset = keyof typeof EXTENSION_FIELDS_PRESETS;

export type ExtensionDesign = ExtensionFieldsLook & {
    actionsBottom: ExtensionActionsBottom;
    placement: ExtensionActionsPlacement;
};

// The base preset: what the settings start from, the first preset in the menu, and what fills in a setting a preset
// saved before it existed. It can be renamed and updated in a browser like any preset, but not deleted. Its values
// are the "Spaced" preset picked in review (2026-11-05): no border, the fields and the buttons 20px in, Raw and Docs
// under the fields.
export const DEFAULT_EXTENSION_DESIGN: ExtensionDesign = {
    actionsBottom: '40',
    border: 'none',
    dividers: false,
    gap: '10',
    indent: '20',
    indentActions: true,
    inner: '12',
    placement: 'below',
    space: '20',
};

export const extensionFieldsGapAtom = atomWithStorage<ExtensionFieldsGap>(
    'hoo-935:fields-gap',
    DEFAULT_EXTENSION_DESIGN.gap,
);
export const extensionFieldsIndentAtom = atomWithStorage<ExtensionFieldsIndent>(
    'hoo-935:fields-indent-px',
    DEFAULT_EXTENSION_DESIGN.indent,
);
export const extensionFieldsBorderAtom = atomWithStorage<ExtensionFieldsBorder>(
    'hoo-935:fields-border',
    DEFAULT_EXTENSION_DESIGN.border,
);
export const extensionFieldsDividersAtom = atomWithStorage<boolean>(
    'hoo-935:fields-dividers',
    DEFAULT_EXTENSION_DESIGN.dividers,
);
export const extensionFieldsSpaceAtom = atomWithStorage<ExtensionFieldsSpace>(
    'hoo-935:fields-space',
    DEFAULT_EXTENSION_DESIGN.space,
);
export const extensionFieldsIndentActionsAtom = atomWithStorage<boolean>(
    'hoo-935:fields-indent-actions',
    DEFAULT_EXTENSION_DESIGN.indentActions,
);
export const extensionFieldsInnerAtom = atomWithStorage<ExtensionFieldsInner>(
    'hoo-935:fields-inner',
    DEFAULT_EXTENSION_DESIGN.inner,
);
export const extensionActionsPlacementAtom = atomWithStorage<ExtensionActionsPlacement>(
    'hoo-935:extension-actions-placement',
    DEFAULT_EXTENSION_DESIGN.placement,
);

export function useExtensionFieldsLook(): ExtensionFieldsLook {
    return {
        border: useAtomValue(extensionFieldsBorderAtom),
        dividers: useAtomValue(extensionFieldsDividersAtom),
        gap: useAtomValue(extensionFieldsGapAtom),
        indent: useAtomValue(extensionFieldsIndentAtom),
        indentActions: useAtomValue(extensionFieldsIndentActionsAtom),
        inner: useAtomValue(extensionFieldsInnerAtom),
        space: useAtomValue(extensionFieldsSpaceAtom),
    };
}

/** The indent in px as drawn: the left border never goes without one, the full frame never takes one. */
export function effectiveIndent({ border, indent }: Pick<ExtensionFieldsLook, 'border' | 'indent'>): number {
    if (border === 'all') return 0;
    return border === 'left' && indent === '0' ? Number(LEFT_BORDER_DEFAULT_INDENT) : Number(indent);
}

export const extensionActionsBottomAtom = atomWithStorage<ExtensionActionsBottom>(
    'hoo-935:actions-bottom',
    DEFAULT_EXTENSION_DESIGN.actionsBottom,
);

export function useExtensionActionsPlacement() {
    return useAtomValue(extensionActionsPlacementAtom);
}

export function useExtensionActionsBottom() {
    return Number(useAtomValue(extensionActionsBottomAtom));
}

/**
 * Whether two sets of field settings draw the same. A setting the border makes moot (the indent inside a full frame,
 * the inner padding outside one) does not count.
 */
export function sameExtensionFieldsLook(a: ExtensionFieldsLook, b: ExtensionFieldsLook): boolean {
    const framed = a.border === 'all';
    return (
        a.border === b.border &&
        a.dividers === b.dividers &&
        a.gap === b.gap &&
        a.space === b.space &&
        (framed || effectiveIndent(a) === effectiveIndent(b)) &&
        (framed || a.indentActions === b.indentActions) &&
        (!framed || a.inner === b.inner)
    );
}

// REVIEW(HOO-935): presets saved from the configurator in this browser, to sketch a few and flip between them. Each
// keeps every setting, Raw and Docs included, under a number that stays put when another one is deleted, and an
// optional name given in the menu.
export type SavedExtensionDesign = ExtensionDesign & { name?: string; number: number };

export const savedExtensionDesignsAtom = atomWithStorage<SavedExtensionDesign[]>('hoo-935:saved-designs', []);

// The base preset holds number 0, which saved presets never take (they start at 1). Until it is renamed or updated in
// a browser it is not stored, so a change of `DEFAULT_EXTENSION_DESIGN` reaches everyone who left it alone.
export const BASE_PRESET_NUMBER = 0;
const BASE_PRESET: SavedExtensionDesign = { ...DEFAULT_EXTENSION_DESIGN, number: BASE_PRESET_NUMBER };

/** The list to store: the base preset only once it differs from the built-in one, by name or by settings. */
export function storablePresets(presets: SavedExtensionDesign[]): SavedExtensionDesign[] {
    return presets.filter(
        design =>
            design.number !== BASE_PRESET_NUMBER ||
            !!design.name ||
            !sameExtensionDesign({ ...DEFAULT_EXTENSION_DESIGN, ...design }, DEFAULT_EXTENSION_DESIGN),
    );
}

/** The presets as the menu lists them: the base one first (stored or built in), then the saved ones. */
export function withBasePreset(saved: SavedExtensionDesign[]): SavedExtensionDesign[] {
    const base = saved.find(design => design.number === BASE_PRESET_NUMBER) ?? BASE_PRESET;
    return [base, ...saved.filter(design => design.number !== BASE_PRESET_NUMBER)];
}

/** Whether two designs draw the same; the space under the buttons counts only while they sit below the fields. */
export function sameExtensionDesign(a: ExtensionDesign, b: ExtensionDesign): boolean {
    return (
        a.placement === b.placement &&
        (a.placement !== 'below' || a.actionsBottom === b.actionsBottom) &&
        sameExtensionFieldsLook(a, b)
    );
}

// A preset without a name of its own goes by its number, the base one by "Base".
export function savedDesignLabel(design: SavedExtensionDesign) {
    return design.name || (design.number === BASE_PRESET_NUMBER ? 'Base' : `Preset ${design.number}`);
}

// Whether the configurator's settings are unfolded in the menu; kept, since the menu closes on every click outside.
export const extensionSettingsOpenAtom = atomWithStorage('hoo-935:settings-open', false);

// The preset last applied or saved, by number: Update writes the settings on screen back into it, Delete removes it.
// Kept apart from the settings, so it stays picked while they are tweaked away from it; none means the base preset.
export const selectedExtensionDesignAtom = atomWithStorage<number | undefined>('hoo-935:selected-preset', undefined);
