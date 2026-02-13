import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 transition-all duration-200 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default:
          "bg-background text-foreground border-border [&>svg]:text-foreground",
        destructive:
          "border-destructive/50 bg-destructive/5 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success:
          "border-green-500/50 bg-green-500/5 text-green-700 dark:text-green-400 dark:border-green-500/30 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        warning:
          "border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400 dark:border-amber-500/30 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        info:
          "border-blue-500/50 bg-blue-500/5 text-blue-700 dark:text-blue-400 dark:border-blue-500/30 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        muted:
          "border-muted bg-muted/50 text-muted-foreground [&>svg]:text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const variantIcons = {
  default: AlertCircle,
  destructive: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  muted: Info,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant,
      icon,
      showIcon = true,
      dismissible = false,
      onDismiss,
      children,
      ...props
    },
    ref
  ) => {
    const IconComponent = variantIcons[variant || "default"];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          alertVariants({ variant }),
          dismissible && "pr-12",
          "animate-in fade-in-0 slide-in-from-top-2 duration-300",
          className
        )}
        {...props}
      >
        {showIcon && (icon || <IconComponent className="h-4 w-4" />)}
        {children}
        {dismissible && (
          <button
            onClick={onDismiss}
            className="absolute right-4 top-4 rounded-full p-1 opacity-70 transition-all hover:opacity-100 hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

// Alert with Action - for alerts that need user action
interface AlertWithActionProps extends AlertProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const AlertWithAction = React.forwardRef<HTMLDivElement, AlertWithActionProps>(
  ({ title, description, action, variant, ...props }, ref) => (
    <Alert ref={ref} variant={variant} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <AlertTitle>{title}</AlertTitle>
          {description && <AlertDescription>{description}</AlertDescription>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </Alert>
  )
);
AlertWithAction.displayName = "AlertWithAction";

// Inline Alert - smaller, for use within forms or inline contexts
interface InlineAlertProps extends VariantProps<typeof alertVariants> {
  message: string;
  className?: string;
}

const InlineAlert = React.forwardRef<HTMLDivElement, InlineAlertProps>(
  ({ message, variant = "default", className }, ref) => {
    const IconComponent = variantIcons[variant || "default"];

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 text-sm py-1.5 px-2.5 rounded-md",
          variant === "destructive" && "text-destructive bg-destructive/10",
          variant === "success" && "text-green-600 bg-green-500/10 dark:text-green-400",
          variant === "warning" && "text-amber-600 bg-amber-500/10 dark:text-amber-400",
          variant === "info" && "text-blue-600 bg-blue-500/10 dark:text-blue-400",
          variant === "default" && "text-muted-foreground bg-muted",
          className
        )}
      >
        <IconComponent className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }
);
InlineAlert.displayName = "InlineAlert";

export {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertWithAction,
  InlineAlert,
  alertVariants,
};
