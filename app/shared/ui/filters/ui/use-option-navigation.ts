import 'client-only';

import React from 'react';

import type { FilterListOption } from '../lib/filter-options';
import { moveActive } from '../lib/list-navigation';

/**
 * Keyboard navigation for a list that keeps focus on its search field or on itself (the APG combobox / listbox
 * pattern): arrows and Page Up / Down move a highlighted option named by `aria-activedescendant`, Enter picks it. The
 * list is a single Tab stop, however long it runs.
 */
export function useOptionNavigation({
    isSelected,
    onPick,
    options,
}: {
    isSelected: (value: string) => boolean;
    onPick: (value: string) => void;
    options: FilterListOption[];
}) {
    const listId = React.useId();
    const [activeValue, setActiveValue] = React.useState<string>();
    const values = options.map(({ value }) => value);
    // A search can drop the highlighted option; the pick, or else the first match, takes over.
    const resolve = (value: string | undefined) =>
        value !== undefined && values.includes(value) ? value : (values.find(isSelected) ?? values[0]);
    const active = resolve(activeValue);
    const scrollOnMove = React.useRef(false);

    const optionId = React.useCallback(
        (value: string) => `${listId}-option-${options.findIndex(option => option.value === value)}`,
        [listId, options],
    );

    React.useEffect(() => {
        if (!scrollOnMove.current || active === undefined) return;
        scrollOnMove.current = false;
        document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    }, [active, optionId]);

    const onKeyDown = (event: React.KeyboardEvent) => {
        const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[event.key];
        if (step !== undefined) {
            event.preventDefault();
            scrollOnMove.current = true;
            // From the previous value, so keys pressed faster than a render each count.
            setActiveValue(previous => moveActive(values, resolve(previous), step));
        } else if (event.key === 'Enter' && active !== undefined) {
            event.preventDefault();
            onPick(active);
        }
    };

    return {
        activeDescendant: active === undefined ? undefined : optionId(active),
        activeValue: active,
        listId,
        onHover: setActiveValue,
        onKeyDown,
        optionId,
    };
}
