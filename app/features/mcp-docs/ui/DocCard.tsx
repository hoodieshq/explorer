import React from 'react';

import { cn } from '@/app/components/shared/utils';

/**
 * Card shell for the MCP docs pages: BaseCard's tw look but with the light
 * `border-white/10` outline used by the block page. A local component instead
 * of a className override because `cn` keeps conflicting classes (no
 * tailwind-merge) and stylesheet order would decide the border color.
 */
export const DocCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { transparent?: boolean }
>(function DocCard({ className, transparent, ...props }, ref) {
    return (
        <div
            ref={ref}
            className={cn(
                'rounded-xl border border-solid border-white/10 text-neutral-200',
                // Prop instead of a `bg-*` className override: cn keeps conflicting classes.
                !transparent && 'bg-heavy-metal-800',
                className,
            )}
            {...props}
        />
    );
});
