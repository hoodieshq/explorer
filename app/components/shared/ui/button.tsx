import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/app/components/shared/utils";

const buttonVariants = cva(
  "e-inline-flex e-items-center e-justify-center e-gap-2 e-whitespace-nowrap e-rounded-md e-text-sm e-font-medium e-transition-colors focus-visible:e-outline-none focus-visible:e-ring-1 focus-visible:e-ring-neutral-950 disabled:e-pointer-events-none disabled:e-opacity-50 [&_svg]:e-pointer-events-none [&_svg]:e-size-4 [&_svg]:e-shrink-0 dark:focus-visible:e-ring-neutral-300",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "e-h-9 e-px-4 e-py-2",
        icon: "e-h-9 e-w-9",
        lg: "e-h-10 e-rounded-md e-px-8",
        sm: "e-h-8 e-rounded-md e-px-3 e-text-xs",
      },
      variant: {
        default:
          "e-bg-neutral-900 e-text-neutral-50 e-shadow hover:e-bg-neutral-900/90 dark:e-bg-neutral-50 dark:e-text-neutral-900 dark:hover:e-bg-neutral-50/90",
        destructive:
          "e-bg-red-500 e-text-neutral-50 e-shadow-sm hover:e-bg-red-500/90 dark:e-bg-red-900 dark:e-text-neutral-50 dark:hover:e-bg-red-900/90",
        ghost: "hover:e-bg-neutral-100 hover:e-text-neutral-900 dark:hover:e-bg-neutral-800 dark:hover:e-text-neutral-50",
        link: "e-text-neutral-900 e-underline-offset-4 hover:e-underline dark:e-text-neutral-50",
        outline:
          "e-border e-border-neutral-200 e-bg-white e-shadow-sm hover:e-bg-neutral-100 hover:e-text-neutral-900 dark:e-border-neutral-800 dark:e-bg-neutral-950 dark:hover:e-bg-neutral-800 dark:hover:e-text-neutral-50",
        secondary:
          "e-bg-neutral-100 e-text-neutral-900 e-shadow-sm hover:e-bg-neutral-100/80 dark:e-bg-neutral-800 dark:e-text-neutral-50 dark:hover:e-bg-neutral-800/80",
      },
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ className, size, variant }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
