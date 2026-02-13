import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const checkboxVariants = cva(
  "peer shrink-0 rounded-[4px] border ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        secondary:
          "border-secondary-foreground/30 data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground data-[state=checked]:border-secondary",
        success:
          "border-green-500/50 data-[state=checked]:bg-green-500 data-[state=checked]:text-white data-[state=checked]:border-green-500",
        destructive:
          "border-destructive/50 data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground data-[state=checked]:border-destructive",
        glow:
          "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-[0_0_10px_var(--primary)]",
      },
      size: {
        sm: "h-3.5 w-3.5",
        default: "h-4 w-4",
        lg: "h-5 w-5",
        xl: "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const iconSizeMap = {
  sm: "h-3 w-3",
  default: "h-3.5 w-3.5",
  lg: "h-4 w-4",
  xl: "h-5 w-5",
};

interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, variant, size, indeterminate, ...props }, ref) => {
  const iconSize = iconSizeMap[size || "default"];

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        checkboxVariants({ variant, size }),
        "hover:border-primary/80 hover:scale-105",
        className
      )}
      {...props}
      checked={indeterminate ? "indeterminate" : props.checked}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        {indeterminate ? (
          <Minus className={cn(iconSize, "animate-in zoom-in-50 duration-150")} />
        ) : (
          <Check className={cn(iconSize, "animate-in zoom-in-50 duration-150")} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

// Checkbox with Label
interface CheckboxWithLabelProps extends CheckboxProps {
  label: string;
  description?: string;
  labelClassName?: string;
}

const CheckboxWithLabel = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxWithLabelProps
>(({ label, description, labelClassName, id, ...props }, ref) => {
  const checkboxId = id || React.useId();

  return (
    <div className="flex items-start gap-3">
      <Checkbox ref={ref} id={checkboxId} {...props} />
      <div className="grid gap-1 leading-none">
        <label
          htmlFor={checkboxId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
            labelClassName
          )}
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
});
CheckboxWithLabel.displayName = "CheckboxWithLabel";

// Checkbox Card - for selection from a list of options
interface CheckboxCardProps extends CheckboxProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

const CheckboxCard = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxCardProps
>(({ title, description, icon, className, ...props }, ref) => {
  const checkboxId = React.useId();

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200",
        "hover:border-primary/50 hover:bg-muted/30",
        "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5",
        className
      )}
    >
      <Checkbox ref={ref} id={checkboxId} {...props} />
      {icon && (
        <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground truncate">
            {description}
          </p>
        )}
      </div>
    </label>
  );
});
CheckboxCard.displayName = "CheckboxCard";

export { Checkbox, CheckboxWithLabel, CheckboxCard, checkboxVariants };
