// TODO(fsd): relocate this module to @shared or the appropriate feature/entity layer.
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../utils';

const inputVariants = cva(
    cn(
        'border-solid',
        'font-normal font-mono',
        'flex w-full rounded border',
        // Native date/time pickers render a dark calendar glyph that's invisible on
        // our dark input backgrounds; invert it so it matches the light input text.
        '[&::-webkit-calendar-picker-indicator]:invert',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid="true"]:!border-destructive aria-[invalid="true"]:focus-visible:ring-destructive',
    ),
    {
        defaultVariants: {
            size: 'default',
            variant: 'default',
        },
        variants: {
            // `sm` is the 32px control of filter panels, matching their chips. `box-border` holds the height
            // where no reset sets border-box (Storybook).
            size: {
                default: 'h-9 px-4 py-2.5 text-xs',
                sm: 'box-border h-8 px-3 py-1.5 text-sm',
            },
            variant: {
                dark: '[color-scheme:dark] border-outer-space-950 bg-heavy-metal-900 text-neutral-200 placeholder:text-neutral-400 focus-visible:ring-accent focus-visible:ring-offset-neutral-900',
                default:
                    'border-neutral-200 bg-transparent text-neutral-200 placeholder:text-neutral-300 focus-visible:ring-neutral-300 focus-visible:ring-offset-neutral-900',
            },
        },
    },
);

// The height variant is `inputSize`, not `size`: callers pass the native `size` attribute (a width in characters)
// straight through, as the IDL argument inputs do.
export interface InputProps extends React.ComponentProps<'input'>, Omit<VariantProps<typeof inputVariants>, 'size'> {
    inputSize?: VariantProps<typeof inputVariants>['size'];
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, inputSize, type, variant, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(inputVariants({ size: inputSize, variant }), className)}
                ref={ref}
                {...props}
            />
        );
    },
);
Input.displayName = 'Input';

export { Input, inputVariants };
