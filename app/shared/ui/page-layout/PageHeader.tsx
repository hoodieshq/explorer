import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

// The eyebrow + title header of a detail page. Sits as the first block inside <PageLayout>.
//
// The negative bottom margin (`-mb-6`, reset to `mb-0` from `lg`) is intentional and must stay: it
// tightens the header against the sticky navigation tabs that follow it on the transaction page,
// offsetting part of the layout's between-blocks rhythm so the tabs sit close under the title. It's
// paired with the layout gap on purpose — keep the two together when adjusting page spacing.
const pageHeaderVariants = cva('-mb-6 flex flex-col gap-1.5 pb-3 pt-2 lg:mb-0');

// The title font scales up one step from `md`, matching the transaction page.
const pageTitleVariants = cva('m-0 font-normal leading-none text-white', {
    defaultVariants: { size: 'default' },
    variants: {
        size: {
            default: 'text-2xl md:text-3xl',
            sm: 'text-xl md:text-2xl',
        },
    },
});

export interface PageHeaderProps
    extends Omit<React.HTMLAttributes<HTMLElement>, 'title'>, VariantProps<typeof pageTitleVariants> {
    /** Small uppercased label above the title (e.g. "Details"). Omitted when not provided. */
    eyebrow?: React.ReactNode;
    /** The page title, rendered as the page's single `<h1>`. */
    title: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
    ({ children, className, eyebrow, size, title, ...props }, ref) => (
        <header ref={ref} className={cnPrefixed(pageHeaderVariants(), className)} {...props}>
            {eyebrow != undefined && eyebrow !== false && (
                <span className="text-xs font-normal uppercase text-muted">{eyebrow}</span>
            )}
            <h1 className={pageTitleVariants({ size })}>{title}</h1>
            {children}
        </header>
    ),
);
PageHeader.displayName = 'PageHeader';

export { PageHeader, pageHeaderVariants, pageTitleVariants };
