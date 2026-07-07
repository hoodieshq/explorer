import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/app/components/shared/utils';

// Fluid container: fills 100% of the available width (minus `px-3` padding, mirroring dashkit's
// `$container-padding-x` = 0.75rem) up to a single `max-width` cap, then `mx-auto` centers it.
// Cap matches dashkit's largest `$container-max-widths` step (xl 1140); unlike Bootstrap's `.container`
// we don't step the max-width down at sm/md/lg, so the content keeps stretching until it hits the cap.
const pageContainerVariants = cva(
    'mx-auto w-full max-w-[1140px] px-3',
    {
        defaultVariants: { variant: 'default' },
        variants: {
            variant: {
                default: '',
                // Bootstrap `.mt-n3` — pulls the container up under the page header's bottom padding
                'pulled-up': '-mt-dk-3',
            },
        },
    },
);

type PageContainerProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof pageContainerVariants>;

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(pageContainerVariants({ variant }), className)} {...props} />
));
PageContainer.displayName = 'PageContainer';

export { PageContainer };
