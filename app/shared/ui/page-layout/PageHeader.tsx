import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn, cnPrefixed } from '@/app/components/shared/utils';

const pageHeaderClassName = 'mb-3 flex flex-col gap-1.5 py-6';

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
    title: React.ReactNode;
    /**
     * Controls for the whole page (e.g. its search), on the title's line at the right edge. They take the room the
     * title leaves and are centred on the title's line rather than on its baseline: a control box such as an icon
     * button has no text baseline, and one that opens into a field would jump when it did.
     */
    actions?: React.ReactNode;
    /**
     * Below `sm`, gives the title's row to the actions (e.g. an open search): the title slides out of it and joins the
     * eyebrow's line as "Eyebrow / Title", in the eyebrow's type. Needs an eyebrow and actions.
     */
    condensed?: boolean;
    /**
     * Lets the actions drop to their own line under the title when the two don't fit side by side, there taking the
     * whole width. Without it they stay on the title's line. Pairs with a control that keeps its width, such as an
     * always-open search field; `condensed` has no effect then.
     */
    wrapActions?: boolean;
}

// The title's row while condensed: the title narrows to nothing and fades, and its gap goes with it, so the actions
// widen across the row. From `sm` nothing condenses.
const condensedTitleVariants = cva(
    'overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity] duration-300 ease-out motion-reduce:transition-none',
    {
        variants: {
            condensed: {
                false: 'mr-3 max-w-full',
                true: 'mr-3 max-w-full max-sm:mr-0 max-sm:max-w-0 max-sm:opacity-0',
            },
        },
    },
);

// The title's copy on the eyebrow's line, shown below `sm` while condensed. Hidden from assistive tech: the h1 stays
// the title there.
const eyebrowTitleVariants = cva('whitespace-nowrap transition-opacity duration-300 sm:hidden', {
    variants: { condensed: { false: 'opacity-0', true: 'opacity-100' } },
});

// The title's row with actions. `wrap`: the actions box starts at 20rem and grows into the room the title leaves, so
// the line breaks exactly when the title and 20rem don't fit; the control inside caps its own width.
const actionsRowVariants = cva('flex items-center justify-between', {
    variants: { wrap: { false: '', true: 'flex-wrap gap-x-3 gap-y-3' } },
});

const actionsBoxVariants = cva('flex min-w-0 justify-end', {
    variants: { wrap: { false: 'flex-1', true: 'grow basis-80' } },
});

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
    ({ actions, children, className, condensed = false, eyebrow, size, title, wrapActions = false, ...props }, ref) => (
        <header ref={ref} className={cnPrefixed(pageHeaderClassName, className)} {...props}>
            {eyebrow != undefined && eyebrow !== false && (
                <span className="text-xs font-normal uppercase text-muted">
                    {eyebrow}
                    {actions && !wrapActions && (
                        <span aria-hidden className={eyebrowTitleVariants({ condensed })}>
                            {' / '}
                            {title}
                        </span>
                    )}
                </span>
            )}
            {actions ? (
                <div className={actionsRowVariants({ wrap: wrapActions })}>
                    <h1
                        className={
                            wrapActions
                                ? pageTitleVariants({ size })
                                : cn(pageTitleVariants({ size }), condensedTitleVariants({ condensed }))
                        }
                    >
                        {title}
                    </h1>
                    <div className={actionsBoxVariants({ wrap: wrapActions })}>{actions}</div>
                </div>
            ) : (
                <h1 className={pageTitleVariants({ size })}>{title}</h1>
            )}
            {children}
        </header>
    ),
);
PageHeader.displayName = 'PageHeader';

export { PageHeader, pageTitleVariants };
