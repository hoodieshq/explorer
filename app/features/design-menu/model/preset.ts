import { useStore, type WritableAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { enums, is } from 'superstruct';

import {
    type ResourcesLayout,
    resourcesLayoutAtom,
    type ResourcesPreview,
    resourcesPreviewAtom,
} from '@/app/shared/ui/resources-layout';
import { type SectionActionsVariant, sectionActionsVariantAtom } from '@/app/shared/ui/section-action';

import { presetEntries, replacePreset } from '../lib/preset-url';

// REVIEW(home-key-value-cards): the menu options a link can set, so a review link opens one preset whatever the
// reader picked before. The mechanism is task-independent; this list follows DesignMenuSections.

type Store = ReturnType<typeof useStore>;

type PresetOption = {
    param: string;
    read: (store: Store) => string;
    write: (store: Store, value: string) => void;
};

const PRESET_OPTIONS: PresetOption[] = [
    presetOption('design-actions', sectionActionsVariantAtom, ['icon', 'wrap'] satisfies SectionActionsVariant[]),
    presetOption('design-layout', resourcesLayoutAtom, [
        'cards',
        'featured',
        'grid',
        'list',
        'row',
    ] satisfies ResourcesLayout[]),
    presetOption('design-previews', resourcesPreviewAtom, [
        'abstract',
        'detailed',
        'simple',
    ] satisfies ResourcesPreview[]),
];

const PRESET_PARAMS = PRESET_OPTIONS.map(option => option.param);

/**
 * Applies the preset a link carries, over whatever the reader picked before, and saves it like a pick in the menu.
 * The parameters then leave the address bar, so a later pick in the menu survives a reload.
 */
export function useApplyPresetFromUrl() {
    const store = useStore();
    useEffect(() => {
        const { hash, pathname, search } = window.location;
        const entries = presetEntries(search, PRESET_PARAMS);
        if (entries.length === 0) return;
        entries.forEach(([param, value]) => PRESET_OPTIONS.find(option => option.param === param)?.write(store, value));
        window.history.replaceState(
            window.history.state,
            '',
            `${pathname}${replacePreset(search, [], PRESET_PARAMS)}${hash}`,
        );
    }, [store]);
}

/** Builds a link to the current page that opens with every option of the menu as it is now. */
export function usePresetLink() {
    const store = useStore();
    return useCallback(() => {
        const { hash, origin, pathname, search } = window.location;
        const preset = PRESET_OPTIONS.map(option => [option.param, option.read(store)] satisfies [string, string]);
        return `${origin}${pathname}${replacePreset(search, preset, PRESET_PARAMS)}${hash}`;
    }, [store]);
}

function presetOption<T extends string>(
    param: string,
    atom: WritableAtom<T, [T], void>,
    values: readonly T[],
): PresetOption {
    const valid = enums(values);
    return {
        param,
        read: store => store.get(atom),
        // A link may carry a value no option has, such as a typo or a variant removed since: ignore it.
        write: (store, value) => {
            if (is(value, valid)) store.set(atom, value);
        },
    };
}
