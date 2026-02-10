"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { AlertCircle, Info } from "lucide-react";

/**
 * FormField - Enhanced form field wrapper with consistent labeling,
 * validation feedback, and accessibility support.
 */

interface FormFieldProps {
  /** Unique field ID for accessibility */
  id: string;
  /** Field label text */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Help text / description */
  description?: string;
  /** The form control element */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether to show optional indicator for non-required fields */
  showOptional?: boolean;
}

export function FormField({
  id,
  label,
  required = false,
  error,
  description,
  children,
  className,
  showOptional = false,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label with required/optional indicator */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-medium",
            error && "text-destructive"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          )}
          {!required && showOptional && (
            <span className="text-muted-foreground ml-1 text-xs font-normal">
              (optional)
            </span>
          )}
        </Label>
      </div>

      {/* Form control with aria attributes */}
      <div className="relative">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              id,
              "aria-invalid": error ? "true" : undefined,
              "aria-describedby": cn(
                error && errorId,
                description && descriptionId
              ) || undefined,
              className: cn(
                (child as React.ReactElement<any>).props.className,
                error && "border-destructive focus-visible:ring-destructive"
              ),
            });
          }
          return child;
        })}
      </div>

      {/* Description text */}
      {description && !error && (
        <p
          id={descriptionId}
          className="text-xs text-muted-foreground flex items-center gap-1"
        >
          <Info className="h-3 w-3" />
          {description}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="text-xs text-destructive flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * FormSection - Group related form fields with a heading
 */
interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional description */
  description?: string;
  /** Form fields */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/**
 * FormActions - Container for form action buttons
 */
interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  /** Alignment of buttons */
  align?: "left" | "right" | "center" | "between";
}

export function FormActions({
  children,
  className,
  align = "right",
}: FormActionsProps) {
  const alignmentClasses = {
    left: "justify-start",
    right: "justify-end",
    center: "justify-center",
    between: "justify-between",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 pt-4 border-t",
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * FieldDependencyHint - Shows when a field will be auto-filled based on another
 */
interface FieldDependencyHintProps {
  /** Source field that triggers the auto-fill */
  sourceField: string;
  /** The value that will be set */
  value?: string;
  /** Whether currently auto-filling */
  isAutoFilling?: boolean;
}

export function FieldDependencyHint({
  sourceField,
  value,
  isAutoFilling = false,
}: FieldDependencyHintProps) {
  if (!value) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
      <span className="inline-flex items-center gap-1">
        {isAutoFilling && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        )}
        Auto-filled from {sourceField}:
        <span className="font-medium text-foreground">{value}</span>
      </span>
    </p>
  );
}

/**
 * RequiredFieldsLegend - Shows legend explaining required field markers
 */
export function RequiredFieldsLegend({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      <span className="text-destructive">*</span> indicates required fields
    </p>
  );
}
