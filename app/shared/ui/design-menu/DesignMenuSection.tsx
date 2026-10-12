'use client';

import { type ReactNode, useId } from 'react';

// REVIEW(design-menu): part of the review-only design menu; remove with it.

/** A titled group of controls in the design menu. */
export function DesignMenuSection({ title, children }: { title: string; children: ReactNode }) {
    const titleId = useId();
    return (
        <div className="flex flex-col gap-2">
            <span id={titleId} className="text-sm text-white">
                {title}
            </span>
            <div role="group" aria-labelledby={titleId} className="flex flex-col gap-2">
                {children}
            </div>
        </div>
    );
}
