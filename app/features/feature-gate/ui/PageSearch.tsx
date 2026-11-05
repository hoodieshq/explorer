'use client';

import { focusRuleStyle } from '@components/shared/focus-rule';
import { cn } from '@components/shared/utils';
import { cva } from 'class-variance-authority';
import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'react-feather';

/**
 * A search over the whole page, for the page header's actions. It opens like the navbar's mobile search
 * (`NavSearch`): a square that widens into the field, its magnifier turning into a cross, with the green focus rule
 * along the bottom. Closed, it is the size and outline of the sections' Collapse button. Below `sm` the open field
 * takes the whole row. It stays open while it holds a query; Escape, or leaving it empty, closes it.
 *
 * Open, the field takes the navbar's own fill and outline (`BAR_CLASSES`: `heavy-metal-850` inside `outer-space-800`,
 * a step lighter on hover) and the colours of its search (`NavSearch` over `BaseSearch`): a white magnifier on the
 * left; the placeholder and the cross in `heavy-metal-100`.
 *
 * `open` is the caller's, so the header can make room for it (`PageHeader`'s `condensed`).
 *
 * REVIEW(HOO-926): `mode` holds the design menu's variants. `button` is the above. In `field` the field is always
 * there, at most 20rem wide and filling the room it is given below that (`PageHeader`'s `wrapActions`); the cross
 * shows only while it holds a query. `combo` is the button below `sm` and, from `sm`, the closed button already drawn
 * as the empty field; focusing the field opens the search.
 */
export function PageSearch({
    value,
    onChange,
    open,
    onOpenChange,
    label,
    placeholder,
    mode = 'button',
}: {
    value: string;
    onChange: (value: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The field's accessible name. */
    label: string;
    placeholder: string;
    mode?: 'button' | 'combo' | 'field';
}) {
    const [focused, setFocused] = useState(false);
    const alwaysOpen = mode === 'field';
    const expanded = alwaysOpen || open || value !== '';
    // The combo, closed: the button below `sm`, the empty field from `sm`.
    const fieldFromSm = mode === 'combo' && !expanded;
    // An always-open field has nothing to open or close: its button is only the cross that clears a query.
    const showToggle = !alwaysOpen || value !== '';
    // From `sm` the combo is a field like `field`'s, whose only button is the cross that clears a query: with no query,
    // its toggle (the opening button, or the closing cross) shows below `sm` only.
    const toggleBelowSmOnly = mode === 'combo' && value === '';
    // Where the text leaves room for the cross.
    const crossInField = crossPlacement(mode, expanded, value !== '');
    const inputRef = useRef<HTMLInputElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    // Closed from the keyboard, focus goes back to the toggle instead of the page top.
    const returnFocus = useRef(false);

    useEffect(() => {
        // An always-open field takes focus only when the visitor puts it there.
        if (alwaysOpen) return;
        if (expanded) {
            inputRef.current?.focus();
            return;
        }
        if (!returnFocus.current) return;
        returnFocus.current = false;
        // From `sm` the combo's toggle is hidden (`offsetParent` is null): closing it leaves the field instead.
        if (mode === 'combo' && toggleRef.current?.offsetParent === null) inputRef.current?.blur();
        else toggleRef.current?.focus();
    }, [alwaysOpen, expanded, mode]);

    const close = () => {
        returnFocus.current = !alwaysOpen;
        onChange('');
        onOpenChange(false);
    };

    // As in the navbar: the cross clears a query first and closes an empty field.
    const toggle = () => {
        if (!expanded) onOpenChange(true);
        else if (value !== '') {
            // Held open by the query alone, the field would close with it.
            onOpenChange(true);
            onChange('');
            inputRef.current?.focus();
        } else close();
    };

    return (
        <div
            onFocus={event => setFocused(event.target === inputRef.current)}
            onBlur={event => {
                setFocused(false);
                if (!event.currentTarget.contains(event.relatedTarget) && value === '') onOpenChange(false);
            }}
            style={expanded ? focusRuleStyle(focused, NAV_BAR_GROUND) : undefined}
            className={frameVariants({ state: frameState(mode, expanded) })}
        >
            {(expanded || fieldFromSm) && (
                <Search size={12} aria-hidden className={magnifierVariants({ fromSm: fieldFromSm })} />
            )}
            {(expanded || fieldFromSm) && (
                <input
                    ref={inputRef}
                    type="search"
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    // The combo's field, shown closed from `sm`, opens the search as it takes focus.
                    onFocus={() => !expanded && onOpenChange(true)}
                    onKeyDown={event => event.key === 'Escape' && close()}
                    placeholder={placeholder}
                    aria-label={label}
                    // The cross on the right replaces the browser's own clear button.
                    className={inputVariants({ beforeCross: crossInField, fromSm: fieldFromSm })}
                />
            )}
            {showToggle && (
                <button
                    ref={toggleRef}
                    type="button"
                    aria-label={expanded ? (value !== '' ? 'Clear search' : 'Close search') : 'Open search'}
                    aria-expanded={alwaysOpen ? undefined : expanded}
                    // A click on the cross shouldn't blur the field first and close it under the pointer.
                    onMouseDown={event => expanded && event.preventDefault()}
                    onClick={toggle}
                    className={toggleVariants({ belowSm: toggleBelowSmOnly, open: expanded })}
                >
                    <span className="relative block size-3">
                        <Search
                            size={12}
                            aria-hidden
                            className={cn(
                                'absolute inset-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none',
                                expanded ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100',
                            )}
                        />
                        <X
                            size={12}
                            aria-hidden
                            className={cn(
                                'absolute inset-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none',
                                expanded ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0',
                            )}
                        />
                    </span>
                </button>
            )}
        </div>
    );
}

function crossPlacement(mode: 'button' | 'combo' | 'field', expanded: boolean, hasQuery: boolean) {
    if (hasQuery) return 'always';
    if (mode === 'button') return expanded ? 'always' : 'never';
    if (mode === 'combo') return expanded ? 'belowSm' : 'never';
    return 'never';
}

function frameState(mode: 'button' | 'combo' | 'field', expanded: boolean) {
    if (mode === 'field') return 'static';
    if (expanded) return 'expanded';
    return mode === 'combo' ? 'collapsedBelowSm' : 'collapsed';
}

// bg-heavy-metal-850, the navbar's background, spelled out for the focus rule to paint over the padding box.
const NAV_BAR_GROUND = 'oklch(25.7% 0.0096 162)';

// The navbar's bottom border colour; the hover lifts it a step, as the navbar's outlined controls do.
const NAV_FIELD_OUTLINE = 'border-outer-space-800 hover:border-outer-space-700';

const COLLAPSED = 'w-7 border-neutral-600 bg-transparent hover:bg-neutral-600/10';

// Closed, the frame of `Button` `outline` `sm` (28px, `neutral-600` outline, no fill); open, the navbar's outline over
// its fill (`NAV_BAR_GROUND`, painted by the focus rule).
const frameVariants = cva(
    cn(
        'relative flex h-7 shrink-0 items-center overflow-hidden rounded border border-solid',
        'transition-[width,border-color,background-color] duration-300 ease-out motion-reduce:transition-none',
    ),
    {
        variants: {
            state: {
                collapsed: COLLAPSED,
                // The combo, closed: from `sm` the open field's size, outline and fill.
                collapsedBelowSm: cn(
                    COLLAPSED,
                    'sm:w-[min(20rem,100%)] sm:border-outer-space-800 sm:bg-heavy-metal-850 sm:hover:border-outer-space-700 sm:hover:bg-heavy-metal-850',
                ),
                expanded: cn(NAV_FIELD_OUTLINE, 'w-full sm:w-[min(20rem,100%)]'),
                // Below `sm` it fills the room the header gives it, the whole row once it drops under the title.
                static: cn(NAV_FIELD_OUTLINE, 'w-full sm:max-w-80'),
            },
        },
    },
);

// Closed, the magnifier is white like the Collapse button's chevron; open, the cross takes the navbar's clear button
// colours, brightening on hover.
const toggleVariants = cva(
    'absolute inset-y-0 right-0 flex w-[26px] cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors',
    {
        variants: {
            belowSm: { false: '', true: 'sm:hidden' },
            open: {
                false: 'text-white hover:text-heavy-metal-100',
                true: 'text-heavy-metal-100 hover:text-white',
            },
        },
    },
);

// Text that runs past the field is cut 4px from the magnifier and from the cross, as close as it can go without
// touching them; the indent still starts it 6px from the magnifier and scrolls away with it. With no cross, the text
// runs to 10px from the frame's edge. (The cross's 12px sit 7px inside its 26px.)
const inputVariants = cva(
    'h-full min-w-0 flex-1 border-0 bg-transparent pl-1 indent-0.5 text-sm text-white outline-none placeholder:text-heavy-metal-100 [&::-webkit-search-cancel-button]:appearance-none',
    {
        variants: {
            beforeCross: { always: 'pr-[23px]', belowSm: 'pr-[23px] sm:pr-2.5', never: 'pr-2.5' },
            // The combo, closed: the field shows from `sm` only.
            fromSm: { false: '', true: 'hidden sm:block' },
        },
    },
);

const magnifierVariants = cva('ml-2 shrink-0 text-white', {
    variants: { fromSm: { false: '', true: 'hidden sm:block' } },
});
