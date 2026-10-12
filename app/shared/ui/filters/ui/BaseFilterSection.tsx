import React from 'react';

import { cn } from '@/app/components/shared/utils';

import { focusFirstControl } from '../lib/focus';
import { BaseResetButton } from './BaseResetButton';

type Props = {
    children: React.ReactNode;
    className?: string;
    // Insets the title row on its own, for lists whose rows run edge to edge and pad themselves.
    headerClassName?: string;
    // Present only while the section has something to clear, so Reset shows only then.
    onReset?: () => void;
    title: string;
};

/** A titled group of filter controls, with a Reset for that group alone. */
export function BaseFilterSection({ children, className, headerClassName, onReset, title }: Props) {
    return (
        // Named by its title, so assistive tech lists it as a region ("Status", "Slot").
        <section aria-label={title} className={className}>
            {/* A fixed 24px row, the title's line height (the 20px reset cross fits inside it), so the row doesn't
                grow when the cross appears. */}
            <div className={cn('mb-2 flex h-6 items-center justify-between gap-4', headerClassName)}>
                {/* 16px against the 14px values it groups, in sentence case, set apart from the regular, muted
                    values by size, weight and a brighter tone. */}
                <h3 className="m-0 text-base font-medium text-white">{title}</h3>
                {onReset && (
                    <BaseResetButton
                        aria-label={`Clear ${title.toLowerCase()} filter`}
                        onClick={event => {
                            // The reset disappears once used; focus moves to the section's first control.
                            focusFirstControl(event.currentTarget.closest('section'));
                            onReset();
                        }}
                    />
                )}
            </div>
            {children}
        </section>
    );
}
