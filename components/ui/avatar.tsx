import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-xs",
        sm: "h-8 w-8 text-sm",
        default: "h-10 w-10 text-base",
        lg: "h-12 w-12 text-lg",
        xl: "h-16 w-16 text-xl",
        "2xl": "h-20 w-20 text-2xl",
      },
      ring: {
        none: "",
        default: "ring-2 ring-background",
        primary: "ring-2 ring-primary",
        success: "ring-2 ring-green-500",
        warning: "ring-2 ring-amber-500",
        destructive: "ring-2 ring-destructive",
      },
    },
    defaultVariants: {
      size: "default",
      ring: "none",
    },
  }
);

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ring, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, ring }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Avatar with Status Indicator
type StatusType = "online" | "offline" | "busy" | "away";

const statusColorMap: Record<StatusType, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

interface AvatarWithStatusProps extends AvatarProps {
  src?: string;
  fallback: string;
  status?: StatusType;
  statusPosition?: "top-right" | "bottom-right";
}

const AvatarWithStatus = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarWithStatusProps
>(
  (
    {
      src,
      fallback,
      status,
      statusPosition = "bottom-right",
      size = "default",
      className,
      ...props
    },
    ref
  ) => {
    const statusSizeMap = {
      xs: "h-1.5 w-1.5",
      sm: "h-2 w-2",
      default: "h-2.5 w-2.5",
      lg: "h-3 w-3",
      xl: "h-3.5 w-3.5",
      "2xl": "h-4 w-4",
    };

    const positionMap = {
      "top-right": "top-0 right-0",
      "bottom-right": "bottom-0 right-0",
    };

    return (
      <div className="relative inline-block">
        <Avatar ref={ref} size={size} className={className} {...props}>
          <AvatarImage src={src} alt={fallback} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        {status && (
          <span
            className={cn(
              "absolute rounded-full ring-2 ring-background",
              statusColorMap[status],
              statusSizeMap[size || "default"],
              positionMap[statusPosition]
            )}
          />
        )}
      </div>
    );
  }
);
AvatarWithStatus.displayName = "AvatarWithStatus";

// Avatar Group - for displaying multiple avatars stacked
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: VariantProps<typeof avatarVariants>["size"];
  className?: string;
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, max = 5, size = "default", className }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleAvatars = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    const overlapMap = {
      xs: "-ml-2",
      sm: "-ml-2.5",
      default: "-ml-3",
      lg: "-ml-4",
      xl: "-ml-5",
      "2xl": "-ml-6",
    };

    return (
      <div ref={ref} className={cn("flex items-center", className)}>
        {visibleAvatars.map((child, index) => (
          <div
            key={index}
            className={cn(
              "relative",
              index > 0 && overlapMap[size || "default"],
              "hover:z-10 transition-transform hover:scale-110"
            )}
            style={{ zIndex: visibleAvatars.length - index }}
          >
            {React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<AvatarProps>, {
                  ring: "default",
                  size,
                })
              : child}
          </div>
        ))}
        {remainingCount > 0 && (
          <Avatar
            size={size}
            ring="default"
            className={cn(overlapMap[size || "default"], "bg-muted")}
          >
            <AvatarFallback className="text-muted-foreground text-xs font-medium">
              +{remainingCount}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = "AvatarGroup";

// User Avatar - combines avatar with name/role
interface UserAvatarProps extends AvatarWithStatusProps {
  name: string;
  role?: string;
  showName?: boolean;
  namePosition?: "right" | "bottom";
}

const UserAvatar = React.forwardRef<HTMLDivElement, UserAvatarProps>(
  (
    {
      name,
      role,
      showName = true,
      namePosition = "right",
      size = "default",
      fallback: _fallback,
      ...props
    },
    ref
  ) => {
    // Generate initials from name
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center",
          namePosition === "bottom" && "flex-col",
          namePosition === "right" && "gap-3"
        )}
      >
        <AvatarWithStatus fallback={initials} size={size} {...props} />
        {showName && (
          <div
            className={cn(
              namePosition === "bottom" && "text-center mt-2",
              namePosition === "right" && "min-w-0"
            )}
          >
            <p className="text-sm font-medium leading-none truncate">{name}</p>
            {role && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {role}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
UserAvatar.displayName = "UserAvatar";

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarWithStatus,
  AvatarGroup,
  UserAvatar,
  avatarVariants,
};
