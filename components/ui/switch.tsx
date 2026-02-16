import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        success:
          "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-input",
        destructive:
          "data-[state=checked]:bg-destructive data-[state=unchecked]:bg-input",
        warning:
          "data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-input",
        glow:
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input data-[state=checked]:shadow-[0_0_12px_var(--primary)]",
      },
      size: {
        sm: "h-5 w-9",
        default: "h-6 w-11",
        lg: "h-7 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const thumbVariants = cva(
  "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform duration-200",
  {
    variants: {
      size: {
        sm: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        default:
          "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        lg: "h-6 w-6 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchVariants> {
  loading?: boolean;
  onIcon?: React.ReactNode;
  offIcon?: React.ReactNode;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      onIcon,
      offIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <SwitchPrimitives.Root
        className={cn(switchVariants({ variant, size }), className)}
        disabled={isDisabled}
        {...props}
        ref={ref}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            thumbVariants({ size }),
            "flex items-center justify-center"
          )}
        >
          {loading ? (
            <svg
              className="h-3 w-3 animate-spin text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <>
              {onIcon && (
                <span className="hidden data-[state=checked]:block text-primary-foreground">
                  {onIcon}
                </span>
              )}
              {offIcon && (
                <span className="block data-[state=checked]:hidden text-muted-foreground">
                  {offIcon}
                </span>
              )}
            </>
          )}
        </SwitchPrimitives.Thumb>
      </SwitchPrimitives.Root>
    );
  }
);
Switch.displayName = SwitchPrimitives.Root.displayName;

// Switch with Label
interface SwitchWithLabelProps extends SwitchProps {
  label: string;
  description?: string;
  labelPosition?: "left" | "right";
}

const SwitchWithLabel = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchWithLabelProps
>(
  (
    { label, description, labelPosition = "right", id, className, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;

    const labelContent = (
      <div className="grid gap-0.5 leading-none">
        <label
          htmlFor={switchId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );

    return (
      <div
        className={cn(
          "flex items-center gap-3",
          labelPosition === "left" && "flex-row-reverse justify-end",
          className
        )}
      >
        <Switch ref={ref} id={switchId} {...props} />
        {labelContent}
      </div>
    );
  }
);
SwitchWithLabel.displayName = "SwitchWithLabel";

// Theme Switch - specialized for dark/light mode
interface ThemeSwitchProps extends Omit<SwitchProps, "onIcon" | "offIcon"> {
  isDark?: boolean;
}

const SunIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );

  const MoonIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );

const ThemeSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  ThemeSwitchProps
>(({ isDark, ...props }, ref) => {

  return (
    <Switch
      ref={ref}
      checked={isDark}
      onIcon={<MoonIcon />}
      offIcon={<SunIcon />}
      {...props}
    />
  );
});
ThemeSwitch.displayName = "ThemeSwitch";

export { Switch, SwitchWithLabel, ThemeSwitch, switchVariants };
