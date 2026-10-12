'use client';

import { Label } from '@components/shared/ui/label';
import { Switch } from '@components/shared/ui/switch';
import { useId } from 'react';

// REVIEW(design-menu): part of the review-only design menu; remove with it.

/** A labelled switch row of the design menu, its track dark while off like the menu around it. */
export function DesignMenuSwitch({
    label,
    checked,
    onCheckedChange,
}: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    const id = useId();
    return (
        <div className="flex items-center justify-between gap-3">
            <Label htmlFor={id} className="cursor-pointer !text-xs text-neutral-200">
                {label}
            </Label>
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                // `!`: `cn` keeps the switch's own light off track too, and the stylesheet order decides between them.
                className="data-[state=unchecked]:!bg-outer-space-700"
            />
        </div>
    );
}
