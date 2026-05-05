"use client";

import { type ElementType } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import type { Notification, NotificationPriority } from "@/src/lib/notifications/notificationTransforms";

const PRIORITY_ICON: Record<NotificationPriority, ElementType> = {
  low: Info,
  normal: Info,
  high: AlertTriangle,
  critical: AlertCircle,
};

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  low: "text-muted-foreground",
  normal: "text-info",
  high: "text-warning",
  critical: "text-critical",
};

export interface NotificationBellItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  showDivider?: boolean;
}

export function NotificationBellItem({
  notification,
  onClick,
  showDivider = true,
}: NotificationBellItemProps) {
  const Icon = PRIORITY_ICON[notification.priority] || Info;
  const iconColor = PRIORITY_COLOR[notification.priority] || "text-info";

  return (
    <>
      <button
        className={cn(
          "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3",
          !notification.is_read && "bg-primary/10"
        )}
        onClick={() => onClick(notification)}
      >
        <div className={cn("mt-0.5 shrink-0", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-xs font-semibold truncate", !notification.is_read && "font-bold")}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {notification.body}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </button>
      {showDivider && <Separator />}
    </>
  );
}
