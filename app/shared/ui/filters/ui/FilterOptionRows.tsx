import { cn } from '@/app/components/shared/utils';

import type { FilterListOption } from '../lib/filter-options';
import { BaseSelectionMark } from './BaseSelectionMark';

type Props = {
    emptyText?: string;
    isSelected: (value: string) => boolean;
    // Square boxes that take a check for several picks; round ones that take a dot for a single pick.
    multiple: boolean;
    onPick: (value: string) => void;
    options: FilterListOption[];
};

/** The option rows shared by the listbox and the dropdown, each led by a checkbox or a radio mark. */
export function FilterOptionRows({ emptyText = 'No matches', isSelected, multiple, onPick, options }: Props) {
    if (options.length === 0) {
        return <div className="px-3 py-1.5 text-sm text-dark-muted-foreground">{emptyText}</div>;
    }
    return (
        <>
            {options.map(({ count, label, value }) => {
                const active = isSelected(value);
                return (
                    // No Preflight here, so the button's UA border, background and font family are reset by hand.
                    // Baseline alignment keeps the count on the label's first line when a long name wraps.
                    <button
                        key={value}
                        type="button"
                        role={multiple ? 'checkbox' : 'radio'}
                        aria-checked={active}
                        onClick={() => onPick(value)}
                        className={cn(
                            'flex w-full cursor-pointer items-baseline gap-2 border-0 bg-transparent px-3 py-1.5 text-left text-sm [font-family:inherit] hover:bg-white/5 hover:text-white',
                            active ? 'text-white' : 'text-dark-muted-foreground',
                        )}
                    >
                        <BaseSelectionMark active={active} multiple={multiple} className="self-start" />
                        <span className="min-w-0 flex-1 break-words">{label}</span>
                        {count !== undefined && <span className="shrink-0 text-xs text-outer-space-300">{count}</span>}
                    </button>
                );
            })}
        </>
    );
}
