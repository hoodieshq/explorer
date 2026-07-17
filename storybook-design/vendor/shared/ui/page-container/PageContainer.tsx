import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/app/components/shared/utils';

// Fluid container: fills 100% of the available width (minus the responsive gutter below) up to a
// single `max-width` cap, then `mx-auto` centers it. The gutter steps up with the viewport —
// 16px (xs) → 20 (sm) → 24 (md) → 32 (lg) → 40 (xl) → 48 (xxl) — so the page breathes more on
// wider screens. Cap is the `xxl` breakpoint (1400px); unlike Bootstrap's `.container` we don't
// step the max-width down at sm/md/lg, so the content keeps stretching until it hits the cap.
const pageContainerVariants = cva('mx-auto w-full max-w-[1400px] px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 xxl:px-12', {
    defaultVariants: { variant: 'default' },
    variants: {
        variant: {
            default: '',
            // Bootstrap `.mt-n3` — pulls the container up under the page header's bottom padding
            'pulled-up': '-mt-dk-3',
        },
    },
});

type PageContainerProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof pageContainerVariants>;

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(pageContainerVariants({ variant }), className)} {...props} />
));
PageContainer.displayName = 'PageContainer';

export { PageContainer };
