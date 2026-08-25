import * as React from 'react';

import { cn } from '@/app/components/shared/utils';
import { DSCOMMON_EYEBROW_TO_TITLE } from '@/app/shared/ui/page-spacing/spacing';

type PageHeaderProps = {
    /** Main page title, rendered as the page's <h1>. */
    title: React.ReactNode;
    /** Small muted uppercase eyebrow above the title. Defaults to "Details". */
    eyebrow?: React.ReactNode;
    /** Wrapper element — `header` by default for page-level semantics; use `div` when nested. */
    as?: 'header' | 'div';
    /** Extra classes on the wrapper, for per-page vertical spacing (py / mb / min-h / etc.). */
    className?: string;
};

// The canonical "Details / <title>" page header: a muted uppercase eyebrow above a large title.
// Shared so the transaction, block, and account pages don't each re-implement — and drift on — the
// markup, sizes, and colors. Per-page vertical spacing stays a concern of the caller via `className`.
export function PageHeader({ title, eyebrow = 'Details', as = 'header', className }: PageHeaderProps) {
    const Wrapper = as as React.ElementType;
    return (
        <Wrapper className={cn('flex flex-col', DSCOMMON_EYEBROW_TO_TITLE.className, className)}>
            <span className="text-xs font-normal uppercase text-muted">{eyebrow}</span>
            <h1 className="m-0 text-2xl font-normal leading-none text-white md:text-3xl">{title}</h1>
        </Wrapper>
    );
}
