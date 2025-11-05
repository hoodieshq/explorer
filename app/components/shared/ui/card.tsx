import { cva, VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../utils';

const cardVariants = cva(
    [
        'e-rounded-xl e-border e-border-solid e-border-[var(--card-border)] e-bg-[var(--card-foreground)] e-text-white',
        'e-shadow-[3px_12px_24px_0px_rgba(20,_24,_22,_0.50)]',
        'e-text-neutral-950 dark:e-border-neutral-800 dark:e-bg-neutral-950 dark:e-text-neutral-50',
    ],
    {
        defaultVariants: {
            variant: 'default',
        },
        variants: {
            variant: {
                default: 'e-px-[25px] e-py-[10px]',
                narrow: 'e-px-3 e-py-2',
            },
        },
    }
);

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('e-flex e-flex-col e-space-y-1.5 e-p-6', className)} {...props} />
    )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('e-text-[15px] e-font-medium e-leading-none e-tracking-tight', className)}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('e-text-sm e-text-neutral-500 dark:e-text-neutral-400', className)} {...props} />
    )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn('e-p-6 e-pt-0', className)} {...props} />
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('e-flex e-items-center e-p-6 e-pt-0', className)} {...props} />
    )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
