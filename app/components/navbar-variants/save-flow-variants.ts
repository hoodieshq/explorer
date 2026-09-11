import { atomWithStorage, createJSONStorage } from 'jotai/utils';

/**
 * Design-review variants of one flow rather than of a whole bar: how the dropdown offers to keep the
 * endpoint in the field under a name. Separate from `registry.ts` because it is orthogonal to it — every
 * navbar variant past the first two opens the same dropdown, so this is a choice inside all of them, and
 * folding it into the bar list would multiply the two.
 *
 * What they have in common, and what the review is not choosing between: the offer is always on screen
 * (the old flow's full-width "Save this cluster" button appeared only once the field held something
 * savable, so the option existed but could not be found), it is small enough not to compete with the
 * endpoint field, and it says a name is part of saving rather than saving first and labelling later.
 *
 * - `omnibox` — the field with Go inside it, at the right-hand end, and Save as a plain button under it.
 *   Nothing applies itself: Go (or Enter) puts the address to use. Save unfolds the name right there,
 *   under the field, with Save and Cancel under it; Go steps aside meanwhile. Save is disabled rather
 *   than absent while there is nothing to keep. Picking a row puts its endpoint back in
 *   the field rather than navigating from under the reader.
 * - `prompt` — a compact "Save as…" button beside the field; the name row unfolds under it when asked for.
 * - `field`  — the name field is simply always there, under the endpoint, with a small Save beside it.
 *   Nothing to open, and the suggested name is visible as its placeholder.
 * - `morph`  — a bookmark button at the end of the field; taking it turns the plate into the naming step,
 *   so the 320px popover shows one field at a time rather than two.
 */
export const SAVE_FLOW_VARIANTS = [
    { id: 'omnibox', name: 'Go in the field, Save under it' },
    { id: 'field', name: 'Name field always up' },
    { id: 'prompt', name: 'Button, then the name' },
    { id: 'morph', name: 'Field becomes the name' },
] as const satisfies readonly { id: string; name: string }[];

export type SaveFlowVariantId = (typeof SAVE_FLOW_VARIANTS)[number]['id'];

export const SAVE_FLOW_VARIANT_IDS: readonly SaveFlowVariantId[] = SAVE_FLOW_VARIANTS.map(v => v.id);

/** Where an unknown stored value lands: the bar, which is the one under review. */
const DEFAULT_SAVE_FLOW_VARIANT: SaveFlowVariantId = 'omnibox';

const STORAGE_KEY = 'explorer:navRpcSaveFlow';

function parseSaveFlowVariant(value: unknown): SaveFlowVariantId {
    // A loop rather than `includes`, which returns a boolean and narrows nothing: the loop variable
    // already carries the type. Same shape as `parseIconSet`.
    for (const id of SAVE_FLOW_VARIANT_IDS) if (value === id) return id;
    return DEFAULT_SAVE_FLOW_VARIANT;
}

/**
 * Validated on read, like the variant id and the icon set: a value written by an earlier build can name a
 * flow this one no longer has, and an unknown id would render no save control at all.
 */
export const saveFlowVariantAtom = (() => {
    const { getItem, setItem, removeItem, subscribe } = createJSONStorage<SaveFlowVariantId>(() => localStorage);
    const validated = {
        getItem: (key: string, initial: SaveFlowVariantId) => parseSaveFlowVariant(getItem(key, initial)),
        removeItem,
        setItem,
        subscribe:
            subscribe &&
            ((key: string, callback: (value: SaveFlowVariantId) => void, initial: SaveFlowVariantId) =>
                subscribe(key, v => callback(parseSaveFlowVariant(v)), initial)),
    };
    return atomWithStorage<SaveFlowVariantId>(STORAGE_KEY, DEFAULT_SAVE_FLOW_VARIANT, validated);
})();
