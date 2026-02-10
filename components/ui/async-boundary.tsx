"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * AsyncBoundary - Unified component for handling async states
 * Provides consistent loading, error, and empty state handling across the app
 */

interface AsyncBoundaryProps {
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether the data set is empty (after loading completes) */
  isEmpty?: boolean;
  /** Content to render when data is available */
  children: React.ReactNode;
  /** Custom loading component */
  loadingFallback?: React.ReactNode;
  /** Custom error component */
  errorFallback?: React.ReactNode;
  /** Custom empty state component */
  emptyFallback?: React.ReactNode;
  /** Retry function for error state */
  onRetry?: () => void;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state title */
  emptyTitle?: string;
  /** Custom empty state action */
  emptyAction?: React.ReactNode;
  /** Minimum height for the boundary container */
  minHeight?: string;
  /** Additional class names */
  className?: string;
}

export function AsyncBoundary({
  isLoading = false,
  error = null,
  isEmpty = false,
  children,
  loadingFallback,
  errorFallback,
  emptyFallback,
  onRetry,
  emptyMessage = "No data found",
  emptyTitle = "Nothing here yet",
  emptyAction,
  minHeight = "200px",
  className,
}: AsyncBoundaryProps) {
  // Loading state
  if (isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-8",
          className
        )}
        style={{ minHeight }}
        role="status"
        aria-label="Loading content"
      >
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 p-8",
          className
        )}
        style={{ minHeight }}
        role="alert"
        aria-live="polite"
      >
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    if (emptyFallback) {
      return <>{emptyFallback}</>;
    }
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 p-8",
          className
        )}
        style={{ minHeight }}
      >
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            {emptyTitle}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {emptyMessage}
          </p>
        </div>
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  // Render children when data is available
  return <>{children}</>;
}

/**
 * InlineLoader - Small inline loading indicator for select dropdowns, etc.
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-2 text-muted-foreground", className)}
      role="status"
      aria-label="Loading"
    >
      <div className="h-4 w-4 rounded-full border-2 border-muted border-t-primary animate-spin" />
      <span className="text-xs">Loading...</span>
    </div>
  );
}

/**
 * SkeletonCard - Reusable skeleton for card layouts
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg border bg-card p-4 space-y-3", className)}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

/**
 * SkeletonTable - Skeleton for table loading states
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card", className)} aria-hidden="true">
      {/* Header skeleton */}
      <div className="p-4 border-b">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      </div>
      {/* Rows skeleton */}
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-8 flex-1 bg-muted animate-pulse rounded"
                style={{
                  animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonForm - Skeleton for form loading states
 */
export function SkeletonForm({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden="true">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div
            className="h-4 w-24 bg-muted animate-pulse rounded"
            style={{ animationDelay: `${index * 100}ms` }}
          />
          <div
            className="h-10 w-full bg-muted animate-pulse rounded"
            style={{ animationDelay: `${index * 100 + 50}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
