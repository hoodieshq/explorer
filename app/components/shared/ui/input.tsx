import * as React from "react";

import { cn } from "@/app/components/shared/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "e-flex e-h-9 e-w-full e-rounded-md e-border e-border-neutral-200 e-bg-transparent e-px-3 e-py-1 e-text-base e-shadow-sm e-transition-colors file:e-border-0 file:e-bg-transparent file:e-text-sm file:e-font-medium file:e-text-neutral-950 placeholder:e-text-neutral-500 focus-visible:e-outline-none focus-visible:e-ring-1 focus-visible:e-ring-neutral-950 disabled:e-cursor-not-allowed disabled:e-opacity-50 md:e-text-sm dark:e-border-neutral-800 dark:file:e-text-neutral-50 dark:placeholder:e-text-neutral-400 dark:focus-visible:e-ring-neutral-300",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
