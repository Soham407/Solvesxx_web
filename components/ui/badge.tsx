import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-green-500/15 text-green-700 dark:text-green-400",
        warning:
          "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
        info:
          "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400",
        muted:
          "border-transparent bg-muted text-muted-foreground",
        ghost:
          "border-transparent bg-transparent hover:bg-muted text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-0.5",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
  dot?: boolean;
  dotColor?: "default" | "success" | "warning" | "destructive" | "info";
  removable?: boolean;
  onRemove?: () => void;
}

const dotColorMap = {
  default: "bg-current",
  success: "bg-green-500",
  warning: "bg-amber-500",
  destructive: "bg-destructive",
  info: "bg-blue-500",
};

function Badge({
  className,
  variant,
  size,
  pulse = false,
  dot = false,
  dotColor = "default",
  removable = false,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant, size }),
        pulse && "animate-pulse",
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "mr-1.5 h-1.5 w-1.5 rounded-full",
            dotColorMap[dotColor]
          )}
        />
      )}
      {children}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-1 -mr-0.5 h-3.5 w-3.5 rounded-full hover:bg-foreground/20 inline-flex items-center justify-center"
          aria-label="Remove"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Badge with Count - for notification counts
interface CountBadgeProps extends VariantProps<typeof badgeVariants> {
  count: number;
  max?: number;
  showZero?: boolean;
  className?: string;
}

function CountBadge({
  count,
  max = 99,
  showZero = false,
  variant = "destructive",
  size = "sm",
  className,
}: CountBadgeProps) {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant={variant}
      size={size}
      className={cn(
        "min-w-[1.25rem] justify-center tabular-nums",
        count > 0 && "animate-in zoom-in-50 duration-200",
        className
      )}
    >
      {displayCount}
    </Badge>
  );
}

// Status Badge - for showing status with a dot
interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  status: "online" | "offline" | "busy" | "away" | "default";
  label?: string;
  className?: string;
}

const statusConfig = {
  online: { dotColor: "success" as const, label: "Online" },
  offline: { dotColor: "default" as const, label: "Offline" },
  busy: { dotColor: "destructive" as const, label: "Busy" },
  away: { dotColor: "warning" as const, label: "Away" },
  default: { dotColor: "default" as const, label: "Unknown" },
};

function StatusBadge({
  status,
  label,
  variant = "outline",
  size = "default",
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={variant}
      size={size}
      dot
      dotColor={config.dotColor}
      className={className}
    >
      {label || config.label}
    </Badge>
  );
}

// Badge Group - for displaying multiple badges
interface BadgeGroupProps {
  children: React.ReactNode;
  max?: number;
  className?: string;
}

function BadgeGroup({ children, max, className }: BadgeGroupProps) {
  const childArray = React.Children.toArray(children);
  const visibleBadges = max ? childArray.slice(0, max) : childArray;
  const remainingCount = max ? childArray.length - max : 0;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleBadges}
      {remainingCount > 0 && (
        <Badge variant="muted" size="sm">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

export { Badge, CountBadge, StatusBadge, BadgeGroup, badgeVariants };
