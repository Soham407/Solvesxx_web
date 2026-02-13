import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const dialogOverlayVariants = cva(
  "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  {
    variants: {
      variant: {
        default: "bg-black/80",
        blur: "bg-black/60 backdrop-blur-sm",
        light: "bg-black/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface DialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>,
    VariantProps<typeof dialogOverlayVariants> {}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, variant, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(dialogOverlayVariants({ variant }), className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const dialogContentVariants = cva(
  "fixed z-50 grid gap-4 border bg-background shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      position: {
        center:
          "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        top:
          "left-[50%] top-4 translate-x-[-50%] data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-4 data-[state=open]:slide-in-from-top-4",
        bottom:
          "left-[50%] bottom-4 translate-x-[-50%] data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
        left:
          "left-4 top-[50%] translate-y-[-50%] data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left-4 data-[state=open]:slide-in-from-left-4",
        right:
          "right-4 top-[50%] translate-y-[-50%] data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-4 data-[state=open]:slide-in-from-right-4",
      },
      size: {
        sm: "w-full max-w-sm p-4 sm:rounded-lg",
        default: "w-full max-w-lg p-6 sm:rounded-lg",
        lg: "w-full max-w-2xl p-6 sm:rounded-lg",
        xl: "w-full max-w-4xl p-6 sm:rounded-lg",
        full: "w-[calc(100%-2rem)] h-[calc(100%-2rem)] max-w-none p-6 rounded-lg",
      },
    },
    defaultVariants: {
      position: "center",
      size: "default",
    },
  }
);

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  hideCloseButton?: boolean;
  overlayVariant?: VariantProps<typeof dialogOverlayVariants>["variant"];
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      hideCloseButton = false,
      position,
      size,
      overlayVariant = "blur",
      ...props
    },
    ref
  ) => (
    <DialogPortal>
      <DialogOverlay variant={overlayVariant} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(dialogContentVariants({ position, size }), className)}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1.5 opacity-70 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left pr-8",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/**
 * DialogScrollArea - A scrollable content area with visual scroll shadows
 * Use this for dialogs with long content that may overflow
 */
interface DialogScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
}

const DialogScrollArea = React.forwardRef<
  HTMLDivElement,
  DialogScrollAreaProps
>(({ className, maxHeight = "60vh", children, ...props }, ref) => {
  const [showTopShadow, setShowTopShadow] = React.useState(false);
  const [showBottomShadow, setShowBottomShadow] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowTopShadow(scrollTop > 0);
    setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 1);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener("scroll", checkScroll);

    // Check on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  return (
    <div ref={ref} className={cn("relative", className)} {...props}>
      {/* Top scroll shadow */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none transition-opacity duration-200",
          showTopShadow ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="overflow-y-auto scrollbar-thin"
        style={{ maxHeight }}
      >
        {children}
      </div>

      {/* Bottom scroll shadow */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none transition-opacity duration-200",
          showBottomShadow ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
});
DialogScrollArea.displayName = "DialogScrollArea";

// Alert Dialog style - for confirmations
interface AlertDialogContentProps extends DialogContentProps {
  variant?: "default" | "destructive";
}

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, variant = "default", ...props }, ref) => (
  <DialogContent
    ref={ref}
    size="sm"
    className={cn(
      variant === "destructive" && "border-destructive/50",
      className
    )}
    {...props}
  />
));
AlertDialogContent.displayName = "AlertDialogContent";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogScrollArea,
  AlertDialogContent,
  dialogContentVariants,
  dialogOverlayVariants,
};
