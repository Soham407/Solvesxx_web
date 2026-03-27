import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const tooltipContentVariants = cva(
  "z-50 overflow-hidden rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  {
    variants: {
      variant: {
        default: "bg-popover text-popover-foreground",
        dark: "bg-primary text-primary-foreground border-primary",
        primary: "bg-primary text-primary-foreground border-primary",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        default: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  showArrow?: boolean;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(
  (
    {
      className,
      sideOffset = 4,
      variant,
      size,
      showArrow = false,
      children,
      ...props
    },
    ref
  ) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        tooltipContentVariants({ variant, size }),
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {children}
      {showArrow && (
        <TooltipPrimitive.Arrow
          className={cn(
            "fill-current",
            variant === "dark" && "text-foreground",
            variant === "primary" && "text-primary",
            variant === "default" && "text-popover"
          )}
        />
      )}
    </TooltipPrimitive.Content>
  )
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Simple Tooltip wrapper for common use case
interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  variant?: VariantProps<typeof tooltipContentVariants>["variant"];
  size?: VariantProps<typeof tooltipContentVariants>["size"];
  showArrow?: boolean;
  asChild?: boolean;
}

function SimpleTooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 300,
  variant = "default",
  size = "default",
  showArrow = false,
  asChild = true,
}: SimpleTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          variant={variant}
          size={size}
          showArrow={showArrow}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Info Tooltip - with info icon trigger
interface InfoTooltipProps extends Omit<SimpleTooltipProps, "children"> {
  iconSize?: "sm" | "default" | "lg";
}

function InfoTooltip({
  content,
  iconSize = "default",
  ...props
}: InfoTooltipProps) {
  const sizeMap = {
    sm: "h-3.5 w-3.5",
    default: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <SimpleTooltip content={content} {...props}>
      <button
        type="button"
        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={sizeMap[iconSize]}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span className="sr-only">More information</span>
      </button>
    </SimpleTooltip>
  );
}

// Truncated Text with Tooltip - shows full text on hover
interface TruncatedTextProps {
  text: string;
  maxWidth?: string;
  className?: string;
  tooltipProps?: Partial<SimpleTooltipProps>;
}

function TruncatedText({
  text,
  maxWidth = "200px",
  className,
  tooltipProps,
}: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = React.useState(false);
  const textRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  }, [text]);

  const textElement = (
    <span
      ref={textRef}
      className={cn("block truncate", className)}
      style={{ maxWidth }}
    >
      {text}
    </span>
  );

  if (!isTruncated) {
    return textElement;
  }

  return (
    <SimpleTooltip content={text} {...tooltipProps}>
      {textElement}
    </SimpleTooltip>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  SimpleTooltip,
  InfoTooltip,
  TruncatedText,
  tooltipContentVariants,
};
