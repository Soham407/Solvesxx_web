export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  priority: NotificationPriority;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body?: string | null;
  message?: string | null;
  type?: string | null;
  notification_type?: string | null;
  priority?: NotificationPriority | null;
  is_read: boolean;
  read_at: string | null;
  action_url?: string | null;
  created_at: string;
  data?: Record<string, unknown> | null;
}

export function sortNotifications(items: Notification[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

export function normalizePriority(priority?: NotificationPriority | null): NotificationPriority {
  switch (priority) {
    case "low":
    case "normal":
    case "high":
    case "critical":
      return priority;
    default:
      return "normal";
  }
}

export function normalizeNotification(row: NotificationRow): Notification {
  const data = row.data ?? {};
  const actionUrlFromData =
    typeof data.action_url === "string"
      ? data.action_url
      : typeof data.route === "string"
        ? data.route
        : null;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    body: row.message ?? row.body ?? "",
    type: row.notification_type ?? row.type ?? "general",
    priority: normalizePriority(row.priority),
    is_read: row.is_read,
    read_at: row.read_at,
    action_url: row.action_url ?? actionUrlFromData,
    created_at: row.created_at,
  };
}

export function getUnreadNotificationCount(notifications: Notification[]) {
  return notifications.filter((notification) => !notification.is_read).length;
}
