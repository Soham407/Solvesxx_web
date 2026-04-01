"use client";

import { useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, NotificationPriority } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = async (
    id: string,
    isRead: boolean,
    actionUrl?: string | null
  ) => {
    try {
      if (!isRead) {
        await markAsRead(id);
      }

      if (actionUrl?.startsWith("/") && !actionUrl.startsWith("//")) {
        setOpen(false);
        router.push(actionUrl);
      }
    } catch (_error) {
      toast.error("Failed to update that notification.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (_error) {
      toast.error("Failed to mark all notifications as read.");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-critical text-white text-[9px] font-bold flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className="font-bold text-sm">Notifications</p>
            {unreadCount > 0 && (
              <p className="text-[10px] text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-primary"
              onClick={() => {
                void handleMarkAllRead();
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark All Read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : error && notifications.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-8 w-8 text-critical/70 mx-auto mb-2" />
              <p className="text-sm font-medium">Unable to load notifications</p>
              <p className="text-[11px] text-muted-foreground mt-1">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification, index) => {
                const Icon = PRIORITY_ICON[notification.priority] || Info;
                const iconColor = PRIORITY_COLOR[notification.priority] || "text-info";
                return (
                  <div key={notification.id}>
                    <button
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3",
                        !notification.is_read && "bg-primary/10"
                      )}
                      onClick={() => {
                        void handleNotificationClick(
                          notification.id,
                          notification.is_read,
                          notification.action_url
                        );
                      }}
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
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
