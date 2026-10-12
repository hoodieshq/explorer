import type React from 'react';

import { cn } from '@/app/components/shared/utils';

import type { FilterListOption } from '../lib/filter-options';
import { BaseSelectionMark } from './BaseSelectionMark';

type Props = {
    activeValue: string | undefined;
    // The list's accessible name, for the `listbox` role.
    'aria-label'?: string;
    emptyText?: string;
    isSelected: (value: string) => boolean;
    listId: string;
    // For a list without a search field, which then takes focus itself: its Tab stop, keys and highlighted row.
    listFocus?: Pick<React.HTMLAttributes<HTMLDivElement>, 'aria-activedescendant' | 'onKeyDown' | 'tabIndex'>;
    // Square boxes that take a check for several picks; round ones that take a dot for a single pick.
    multiple: boolean;
    onHover: (value: string) => void;
    onPick: (value: string) => void;
    optionId: (value: string) => string;
    options: FilterListOption[];
};

/**
 * The option rows shared by the listbox and the dropdown, each led by a checkbox or a radio mark. The rows take no
 * focus of their own: the search field (or the list) keeps it and names the highlighted row via
 * `aria-activedescendant`, which is drawn like hover.
 */
export function FilterOptionRows({
    activeValue,
    'aria-label': ariaLabel,
    emptyText = 'No matches',
    isSelected,
    listId,
    listFocus,
    multiple,
    onHover,
    onPick,
    optionId,
    options,
}: Props) {
    return (
        <>
            <div
                id={listId}
                role="listbox"
                aria-label={ariaLabel}
                aria-multiselectable={multiple || undefined}
                className="outline-none"
                {...listFocus}
            >
                {options.map(({ count, label, value }) => {
                    const selected = isSelected(value);
                    return (
                        // Baseline alignment keeps the count on the label's first line when a long name wraps.
                        <div
                            key={value}
                            id={optionId(value)}
                            role="option"
                            aria-selected={selected}
                            // A press must not pull focus off the field that owns the list.
                            onMouseDown={event => event.preventDefault()}
                            onMouseMove={() => onHover(value)}
                            onClick={() => onPick(value)}
                            className={cn(
                                'flex w-full cursor-pointer items-baseline gap-2 px-3 py-1.5 text-left text-sm',
                                selected ? 'text-white' : 'text-dark-muted-foreground',
                                value === activeValue && 'bg-white/5 text-white',
                            )}
                        >
                            <BaseSelectionMark active={selected} multiple={multiple} className="self-start" />
                            <span className="min-w-0 flex-1 break-words">{label}</span>
                            {count !== undefined && (
                                <span className="shrink-0 text-xs text-outer-space-300">{count}</span>
                            )}
                        </div>
                    );
                })}
            </div>
            {options.length === 0 && <div className="px-3 py-1.5 text-sm text-dark-muted-foreground">{emptyText}</div>}
        </>
    );
}
