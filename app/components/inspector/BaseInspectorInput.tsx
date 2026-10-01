import { cva } from 'class-variance-authority';
import React from 'react';
import { AlertCircle } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { cn } from '@/app/components/shared/utils';

export const INSPECTOR_INPUT_LABEL = 'Inspector input';

const textareaVariants = cva(
    [
        // min-h adds 40px to the three-row default so the field reads as the page's main control.
        'block min-h-[126px] w-full resize-none rounded-lg border border-solid bg-heavy-metal-900 px-4 py-3 pr-20',
        'font-mono text-sm text-white placeholder:text-outer-space-300',
        'focus:outline-none focus-visible:outline-none',
    ],
    {
        defaultVariants: { invalid: false },
        variants: {
            invalid: {
                false: 'border-outer-space-800 focus:border-accent',
                true: 'border-destructive',
            },
        },
    },
);

export type BaseInspectorInputProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-label'> & {
    error?: string;
    hasValue: boolean;
    onClear: () => void;
};

/** The inspector's primary input: a raw transaction or Squads account address, with an inline Clear and error line. */
export const BaseInspectorInput = React.forwardRef<HTMLTextAreaElement, BaseInspectorInputProps>(
    ({ error, hasValue, onClear, className, ...props }, ref) => (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <textarea
                    ref={ref}
                    aria-label={INSPECTOR_INPUT_LABEL}
                    aria-invalid={error ? true : undefined}
                    className={cn(textareaVariants({ invalid: Boolean(error) }), className)}
                    {...props}
                />
                {hasValue && (
                    <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={onClear}
                        className="absolute right-3 top-3"
                    >
                        Clear
                    </Button>
                )}
            </div>
            {error && (
                <div className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
                    <AlertCircle size={14} aria-hidden />
                    <span>{error}</span>
                </div>
            )}
        </div>
    ),
);
BaseInspectorInput.displayName = 'BaseInspectorInput';
