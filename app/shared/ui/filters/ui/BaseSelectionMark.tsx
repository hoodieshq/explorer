import { Check } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

type Props = {
    active: boolean;
    // Places the mark in its row: inline (`self-start` in a flex row) or in a padded gutter (`absolute …`).
    className?: string;
    // A square that takes a check for one of several picks; a circle that takes a dot for a single pick.
    multiple: boolean;
};

/** The checkbox or radio mark that leads a filter option. */
export function BaseSelectionMark({ active, className, multiple }: Props) {
    return (
        // One line tall (`1lh`), with the 14px box centred in it, so the mark sits on the label's first line even
        // when a long label wraps.
        <span aria-hidden className={cn('flex h-[1lh] shrink-0 items-center', className)}>
            <span
                className={cn(
                    'flex h-3.5 w-3.5 items-center justify-center border border-solid',
                    multiple ? 'rounded-sm' : 'rounded-full',
                    active ? 'border-accent' : 'border-outer-space-600',
                    active && multiple && 'bg-accent',
                )}
            >
                {active &&
                    (multiple ? (
                        <Check size={10} strokeWidth={3} className="text-heavy-metal-950" />
                    ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    ))}
            </span>
        </span>
    );
}
