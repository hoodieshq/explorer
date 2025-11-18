import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/app/components/shared/utils';

const badgeVariants = cva(
    cn(
        'e-inline-flex e-items-center e-justify-center e-border e-border-neutral-200',
        'e-px-2 e-py-0.5 e-font-medium e-w-fit e-whitespace-break-spaces e-shrink-0',
        '[&>svg]:e-size-3 e-gap-1 [&>svg]:e-pointer-events-none',
        'focus-visible:e-border-neutral-950 focus-visible:e-ring-neutral-950/50 focus-visible:e-ring-[3px]',
        'aria-invalid:e-ring-red-500/20 aria-invalid:e-border-red-500',
        'e-transition-[color,box-shadow] e-overflow-hidden'
    ),
    {
        compoundVariants: [
            {
                as: 'link',
                class: 'e-rounded-sm',
                size: 'xs',
            },
            {
                as: 'link',
                class: 'e-py-0.5 e-px-2 e-text-[0.8125rem] e-leading-[1.75] e-rounded',
                size: 'sm',
            },
            {
                as: 'link',
                class: 'e-rounded-md',
                size: 'md',
            },
            {
                as: 'link',
                class: 'e-rounded-md',
                size: 'lg',
            },
        ],
        defaultVariants: {
            as: 'badge',
            size: 'xs',
            status: 'inactive',
            variant: 'default',
        },
        variants: {
            as: {
                badge: 'e-rounded',
                link: '/* no styles except compound variants */',
            },
            size: {
                lg: 'e-text-lg',
                md: 'e-text-md',
                sm: 'e-text-sm',
                xs: 'e-text-xs',
            },
            status: {
                active: 'e-shadow-active',
                inactive: '',
            },
            variant: {
                default: 'e-border-transparent e-text-neutral-900 [a&]:hover:e-bg-neutral-100/90',
                destructive:
                    'e-border-transparent e-bg-destructive -e-text-white [a&]:hover:e-bg-destructive/90 focus-visible:e-ring-destructive/20',
                info: 'e-border-transparent e-bg-teal-900 e-text-teal-400 [a&]:hover:e-bg-teal-900/90 focus-visible:e-ring-teal-900/20',
                secondary:
                    'e-border-transparent e-bg-neutral-400 e-text-neutral-800 [a&]:hover:e-bg-neutral-900/90 focus-visible:e-ring-neutral-900/20',
                success:
                    'e-border-transparent e-text-green-400 e-bg-green-900 [a&]:hover:e-bg-green-900/90 focus-visible:e-ring-green-900/20',

                transparent: 'e-border-transparent e-bg-transparent e-text-neutral-900 [a&]:hover:e-bg-neutral-100/90',

                warning:
                    'e-border-transparent e-bg-orange-950 e-text-orange-400 [a&]:hover:e-bg-orange-950/90 focus-visible:e-ring-orange-950/20',
            },
        },
    }
);

function Badge({
    className,
    as,
    size,
    status,
    variant,
    asChild = false,
    ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'span';

    return (
        <Comp data-slot="badge" className={cn(badgeVariants({ as, size, status, variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
