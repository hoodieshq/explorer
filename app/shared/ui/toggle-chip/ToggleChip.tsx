import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import React from 'react';

export type ToggleChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean };

// Small on/off button: the solid `default` Button with an accent border when on, the `outline` Button when
// off. First used as the Parsed / RAW switch in the transaction Logs section. `aria-pressed` carries the same
// state for assistive tech; callers own the click handling.
export function ToggleChip({ children, className, active = false, ...props }: ToggleChipProps) {
    return (
        <Button
            variant={active ? 'default' : 'outline'}
            size="sm"
            aria-pressed={active}
            className={cn(active && '!border-accent', className)}
            {...props}
        >
            {children}
        </Button>
    );
}
