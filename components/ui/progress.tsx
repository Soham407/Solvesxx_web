import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: {
        sm: "h-1.5",
        default: "h-2.5",
        lg: "h-4",
        xl: "h-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-primary",
        gradient:
          "bg-gradient-to-r from-primary via-primary/80 to-primary",
        success:
          "bg-gradient-to-r from-green-600 to-green-500",
        warning:
          "bg-gradient-to-r from-amber-600 to-amber-500",
        danger:
          "bg-gradient-to-r from-red-600 to-red-500",
        info:
          "bg-gradient-to-r from-blue-600 to-blue-500",
        striped: "bg-primary",
        rainbow:
          "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressIndicatorVariants> {
  showLabel?: boolean;
  labelPosition?: "inside" | "outside";
  animated?: boolean;
  indeterminate?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value,
      size,
      variant,
      showLabel = false,
      labelPosition = "outside",
      animated = false,
      indeterminate = false,
      ...props
    },
    ref
  ) => {
    const percentage = value ?? 0;

    // Striped animation styles
    const stripedStyles =
      variant === "striped"
        ? {
            backgroundImage:
              "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)",
            backgroundSize: "1rem 1rem",
          }
        : {};

    return (
      <div className={cn("w-full", showLabel && "space-y-1")}>
        {showLabel && labelPosition === "outside" && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(percentage)}%</span>
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(progressVariants({ size }), className)}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              progressIndicatorVariants({ variant }),
              animated && variant === "striped" && "animate-[progress-stripes_1s_linear_infinite]",
              indeterminate && "animate-[progress-indeterminate_1.5s_ease-in-out_infinite]"
            )}
            style={{
              transform: indeterminate ? undefined : `translateX(-${100 - percentage}%)`,
              ...stripedStyles,
            }}
          >
            {showLabel && labelPosition === "inside" && size !== "sm" && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground">
                {Math.round(percentage)}%
              </span>
            )}
          </ProgressPrimitive.Indicator>
        </ProgressPrimitive.Root>
      </div>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

// Circular Progress component
interface CircularProgressProps {
  value?: number;
  size?: "sm" | "default" | "lg" | "xl";
  strokeWidth?: number;
  showLabel?: boolean;
  variant?: "default" | "gradient" | "success" | "warning" | "danger";
  className?: string;
}

const sizeMap = {
  sm: 32,
  default: 48,
  lg: 64,
  xl: 96,
};

const strokeWidthMap = {
  sm: 3,
  default: 4,
  lg: 5,
  xl: 6,
};

const variantColorMap = {
  default: "stroke-primary",
  gradient: "stroke-primary",
  success: "stroke-green-500",
  warning: "stroke-amber-500",
  danger: "stroke-red-500",
};

const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  (
    {
      value = 0,
      size = "default",
      strokeWidth,
      showLabel = true,
      variant = "default",
      className,
    },
    ref
  ) => {
    const svgSize = sizeMap[size];
    const stroke = strokeWidth ?? strokeWidthMap[size];
    const radius = (svgSize - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className={cn("relative inline-flex items-center justify-center", className)}>
        <svg
          ref={ref}
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-secondary"
          />
          {/* Progress circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              variantColorMap[variant],
              "transition-[stroke-dashoffset] duration-500 ease-out"
            )}
          />
        </svg>
        {showLabel && (
          <span
            className={cn(
              "absolute font-semibold",
              size === "sm" && "text-[10px]",
              size === "default" && "text-xs",
              size === "lg" && "text-sm",
              size === "xl" && "text-lg"
            )}
          >
            {Math.round(value)}%
          </span>
        )}
      </div>
    );
  }
);
CircularProgress.displayName = "CircularProgress";

export { Progress, CircularProgress, progressVariants, progressIndicatorVariants };
