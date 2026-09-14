import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { BaseInstructionDisplay } from '@entities/idl';
import { useState } from 'react';
import { ChevronDown } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

/**
 * The sRFC 39 display for the instruction the form describes: an intent sentence and its fields.
 * Values are raw base58 by design — the display layer leaves address presentation to the renderer.
 */
export function InstructionDisplaySummary({
    display,
    defaultExpanded = false,
    className,
}: {
    display: InstructionDisplay;
    defaultExpanded?: boolean;
    className?: string;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div
            className={cn('rounded-lg border border-neutral-800 bg-[#1a1b1d]', className)}
            data-testid="instruction-display-summary"
        >
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded(current => !current)}
                className="flex w-full appearance-none items-center justify-between border-0 bg-transparent px-3 py-2.5 text-xs font-medium text-white"
            >
                Summary
                <ChevronDown
                    size={14}
                    className={cn(
                        'shrink-0 text-neutral-400 transition-transform duration-200 ease-in-out',
                        // Explicit `transform` rather than `rotate-*` so an ancestor's translate cannot override it.
                        expanded && '[transform:rotate(180deg)]',
                    )}
                />
            </button>

            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-in-out',
                    expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-neutral-800 px-3 py-2.5">
                        <BaseInstructionDisplay display={display} />
                    </div>
                </div>
            </div>
        </div>
    );
}
