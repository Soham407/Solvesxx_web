"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Gauge,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { NotificationBellItem } from "@/components/layout/NotificationBellItem";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { toast } from "sonner";

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: typeof Gauge;
}) {
  return (
    <Card className="border-none shadow-card ring-1 ring-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getPriorityBadgeClass(priority: string) {
  switch (priority) {
    case "critical":
      return "border-critical/20 bg-critical/10 text-critical";
    case "high":
      return "border-warning/20 bg-warning/10 text-warning";
    default:
      return "border-primary/20 bg-primary/10 text-primary";
  }
}

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllRead } =
    useNotifications();
  const { getNumber } = usePlatformConfig();

  const recentNotifications = useMemo(
    () => notifications.filter((notification) => {
      const createdAt = new Date(notification.created_at).getTime();
      return Date.now() - createdAt <= 24 * 60 * 60 * 1000;
    }),
    [notifications]
  );

  const criticalCount = useMemo(
    () => notifications.filter((notification) => notification.priority === "critical").length,
    [notifications]
  );

  const actionReadyCount = useMemo(
    () => notifications.filter((notification) => Boolean(notification.action_url)).length,
    [notifications]
  );

  const handleNotificationClick = useCallback(
    async (notificationId: string, isRead: boolean, actionUrl?: string | null) => {
      try {
        if (!isRead) {
          await markAsRead(notificationId);
        }

        if (actionUrl?.startsWith("/") && !actionUrl.startsWith("//")) {
          router.push(actionUrl);
        }
      } catch (_error) {
        // The shared bell already surfaces errors; keep this page simple.
      }
    },
    [markAsRead, router]
  );

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, [router]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRead();
    } catch (_error) {
      toast.error("Failed to mark all notifications as read.");
    }
  }, [markAllRead]);

  const checklistThreshold = getNumber("checklist_completion_alert_threshold_percent");
  const geoFenceRadius = getNumber("default_geo_fence_radius_meters");
  const inactivityThreshold = getNumber("guard_inactivity_threshold_minutes");

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Notifications"
        description="Review live platform notifications and the operational thresholds that feed the alert pipeline."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button className="gap-2" onClick={() => void handleMarkAllRead()} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Unread"
          value={isLoading ? "..." : unreadCount.toString()}
          subtext="Pending in-app notifications"
          icon={Bell}
        />
        <StatCard
          label="Critical"
          value={isLoading ? "..." : criticalCount.toString()}
          subtext="High-priority alerts"
          icon={AlertCircle}
        />
        <StatCard
          label="Action Ready"
          value={isLoading ? "..." : actionReadyCount.toString()}
          subtext="Notifications with a destination"
          icon={Sparkles}
        />
        <StatCard
          label="24h Activity"
          value={isLoading ? "..." : recentNotifications.length.toString()}
          subtext="Notifications in the last day"
          icon={Gauge}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Live Notification Feed
              </CardTitle>
              <CardDescription>
                The same realtime stream that powers the top-right bell. Click an item to mark it
                read and follow its linked route if one exists.
              </CardDescription>
            </div>
            <Badge className="bg-success/10 text-success hover:bg-success/10">
              Realtime enabled
            </Badge>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/40" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">No notifications yet</p>
                  <p className="text-sm text-muted-foreground">
                    Alerts from panic, visitors, service requests, and finance will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[32rem] rounded-xl border border-border/60">
                <div>
                  {notifications.map((notification, index) => (
                    <div key={notification.id} className="relative">
                      <NotificationBellItem
                        notification={notification}
                        onClick={(item) =>
                          void handleNotificationClick(
                            item.id,
                            item.is_read,
                            item.action_url
                          )
                        }
                        showDivider={index < notifications.length - 1}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-card ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Operational Thresholds
              </CardTitle>
              <CardDescription>
                These values drive the platform events that emit notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ThresholdRow
                label="Checklist escalation"
                value={`${checklistThreshold}%`}
                description="Checklist alerts fire below this completion level."
              />
              <ThresholdRow
                label="Geo-fence radius"
                value={`${geoFenceRadius}m`}
                description="Fallback distance used for location-sensitive flows."
              />
              <ThresholdRow
                label="Guard inactivity"
                value={`${inactivityThreshold} min`}
                description="Idle guards can trigger inactivity alerts after this duration."
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-card ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Active Delivery Surfaces
              </CardTitle>
              <CardDescription>
                Existing sources that already produce live in-app notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Panic alerts and supervisor acknowledgments",
                "Visitor check-ins and resident approvals",
                "Service request status changes",
                "Purchase order, GRN, and billing milestones",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm"
                >
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ThresholdRow({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <Badge variant="outline" className={getPriorityBadgeClass("normal")}>
          {value}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
