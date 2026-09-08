import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cnPrefixed } from '@/app/components/shared/utils';

// The shell of a detail page (Transaction / Block / Account). Owns the page's horizontal padding,
// top padding, content max-width and the vertical rhythm between its blocks — the values the
// transaction page established, now in one place so every detail page shares a single spacing
// source instead of re-typing the class string.
//
// Project breakpoints switch the wide values at `lg` (992px): the mobile/tablet values run through
// `md`, the desktop values begin at `lg`.
const pageLayoutVariants = cva('mx-auto flex flex-col px-4 pt-3 lg:px-6 lg:pt-5', {
    defaultVariants: { gap: 'default', width: 'default' },
    variants: {
        // Vertical rhythm applied between the direct children (header, cards, tab sections). `none`
        // opts a page out when it needs to own spacing between specific blocks itself.
        gap: {
            default: 'space-y-9 lg:space-y-12',
            none: '',
        },
        // Content column max-width. `default` caps at the detail-page width; `full` spans the parent.
        width: {
            default: 'max-w-5xl',
            full: 'max-w-none',
        },
    },
});

export interface PageLayoutProps
    extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageLayoutVariants> {}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(({ className, gap, width, ...props }, ref) => (
    <div ref={ref} className={cnPrefixed(pageLayoutVariants({ gap, width }), className)} {...props} />
));
PageLayout.displayName = 'PageLayout';

export { PageLayout, pageLayoutVariants };
