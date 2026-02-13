import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default:
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/50",
        ghost:
          "border-transparent bg-transparent hover:bg-muted/50 focus-visible:bg-background focus-visible:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        filled:
          "border-transparent bg-muted/50 hover:bg-muted/70 focus-visible:bg-background focus-visible:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        glow:
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_var(--primary)]",
      },
      inputSize: {
        sm: "h-8 px-2.5 py-1.5 text-xs rounded",
        default: "h-10 px-3 py-2",
        lg: "h-12 px-4 py-3 text-base",
        xl: "h-14 px-5 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant,
      inputSize,
      leftIcon,
      rightIcon,
      error,
      success,
      ...props
    },
    ref
  ) => {
    // State classes for error/success
    const stateClasses = error
      ? "border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/30 text-destructive placeholder:text-destructive/50"
      : success
        ? "border-green-500/50 focus-visible:border-green-500 focus-visible:ring-green-500/30"
        : "";

    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, inputSize }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              stateClasses,
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          inputVariants({ variant, inputSize }),
          stateClasses,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// Search Input with built-in search icon
interface SearchInputProps extends InputProps {
  onSearch?: (value: string) => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        variant="filled"
        leftIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        }
        className={cn("pr-4", className)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSearch) {
            onSearch((e.target as HTMLInputElement).value);
          }
        }}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";

export { Input, SearchInput, inputVariants };
