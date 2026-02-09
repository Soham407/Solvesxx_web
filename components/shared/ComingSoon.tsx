import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Construction, type LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg" | "full";
}

export function ComingSoon({
  title = "Coming Soon",
  description = "This feature is under development and will be available soon.",
  icon: Icon = Construction,
  size = "md",
}: ComingSoonProps) {
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    full: "p-12 h-full flex flex-col justify-center",
  };

  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    full: "h-16 w-16",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    full: "text-xl",
  };

  return (
    <Card className="border-dashed border-muted-foreground/20">
      <CardContent
        className={`flex flex-col items-center justify-center text-center gap-2 ${sizeClasses[size]}`}
      >
        <div className="rounded-full bg-muted p-3">
          <Icon className={`${iconSizes[size]} text-muted-foreground`} />
        </div>
        <h3 className={`font-semibold ${textSizes[size]}`}>{title}</h3>
        {size !== "sm" && (
          <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ComingSoonWidget({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center gap-2">
      <Clock className="h-8 w-8 text-muted-foreground" />
      <h4 className="font-medium text-sm">{title || "Coming Soon"}</h4>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function ComingSoonChart({ height = 200 }: { height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center border border-dashed border-muted-foreground/20 rounded-lg bg-muted/30"
      style={{ height }}
    >
      <Construction className="h-8 w-8 text-muted-foreground mb-2" />
      <span className="text-sm text-muted-foreground">Analytics Coming Soon</span>
    </div>
  );
}

export function ComingSoonCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed border-muted-foreground/20">
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <Construction className="h-10 w-10 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
