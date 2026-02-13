import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const skeletonVariants = cva("rounded-md bg-muted", {
  variants: {
    animation: {
      pulse: "animate-pulse",
      shimmer:
        "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
      wave:
        "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[wave_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent",
      none: "",
    },
  },
  defaultVariants: {
    animation: "pulse",
  },
});

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, animation, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ animation }), className)}
      {...props}
    />
  );
}

// Skeleton Text - for text placeholders
interface SkeletonTextProps extends SkeletonProps {
  lines?: number;
  lastLineWidth?: "full" | "3/4" | "1/2" | "1/4";
}

function SkeletonText({
  lines = 3,
  lastLineWidth = "3/4",
  className,
  animation,
  ...props
}: SkeletonTextProps) {
  const lastWidthMap = {
    full: "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
    "1/4": "w-1/4",
  };

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          animation={animation}
          className={cn(
            "h-4",
            i === lines - 1 ? lastWidthMap[lastLineWidth] : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// Skeleton Avatar - circular placeholder
interface SkeletonAvatarProps extends SkeletonProps {
  size?: "xs" | "sm" | "default" | "lg" | "xl";
}

function SkeletonAvatar({
  size = "default",
  className,
  animation,
  ...props
}: SkeletonAvatarProps) {
  const sizeMap = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <Skeleton
      animation={animation}
      className={cn("rounded-full", sizeMap[size], className)}
      {...props}
    />
  );
}

// Skeleton Card - for card-like content
interface SkeletonCardProps extends SkeletonProps {
  hasImage?: boolean;
  hasAvatar?: boolean;
}

function SkeletonCard({
  hasImage = true,
  hasAvatar = false,
  className,
  animation,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      className={cn("rounded-lg border bg-card p-4 space-y-4", className)}
      {...props}
    >
      {hasImage && (
        <Skeleton animation={animation} className="h-40 w-full rounded-md" />
      )}
      <div className="space-y-3">
        {hasAvatar && (
          <div className="flex items-center gap-3">
            <SkeletonAvatar animation={animation} size="sm" />
            <div className="space-y-1.5 flex-1">
              <Skeleton animation={animation} className="h-3 w-24" />
              <Skeleton animation={animation} className="h-2.5 w-16" />
            </div>
          </div>
        )}
        <Skeleton animation={animation} className="h-5 w-3/4" />
        <SkeletonText animation={animation} lines={2} lastLineWidth="1/2" />
      </div>
    </div>
  );
}

// Skeleton Table Row - for table loading states
interface SkeletonTableRowProps extends SkeletonProps {
  columns?: number;
}

function SkeletonTableRow({
  columns = 4,
  className,
  animation,
  ...props
}: SkeletonTableRowProps) {
  return (
    <div className={cn("flex items-center gap-4 py-3", className)} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          animation={animation}
          className={cn(
            "h-4",
            i === 0 ? "w-8" : i === columns - 1 ? "w-16" : "flex-1"
          )}
        />
      ))}
    </div>
  );
}

// Skeleton List Item - for list loading states
interface SkeletonListItemProps extends SkeletonProps {
  hasAvatar?: boolean;
  hasAction?: boolean;
}

function SkeletonListItem({
  hasAvatar = true,
  hasAction = false,
  className,
  animation,
  ...props
}: SkeletonListItemProps) {
  return (
    <div
      className={cn("flex items-center gap-4 py-2", className)}
      {...props}
    >
      {hasAvatar && <SkeletonAvatar animation={animation} size="sm" />}
      <div className="flex-1 space-y-1.5">
        <Skeleton animation={animation} className="h-4 w-32" />
        <Skeleton animation={animation} className="h-3 w-24" />
      </div>
      {hasAction && <Skeleton animation={animation} className="h-8 w-16 rounded" />}
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonListItem,
  skeletonVariants,
};
