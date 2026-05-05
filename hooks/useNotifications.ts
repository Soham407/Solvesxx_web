"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabaseClient";
import {
  getUnreadNotificationCount,
  normalizeNotification,
  sortNotifications,
  type NotificationPriority,
  type Notification,
  type NotificationRow,
} from "@/src/lib/notifications/notificationTransforms";

export type { NotificationPriority };

type LocalNotificationRow = NotificationRow & {
  read_at: string | null;
  data?: { action_url?: string | null } | null;
};

function parseNotificationRow(row: LocalNotificationRow): Notification {
  const body = row.message ?? row.body ?? "";
  const type = row.notification_type ?? row.type ?? "general";
  const actionUrl = (row.data != null ? row.data.action_url : null) ?? row.action_url ?? null;
  return normalizeNotification({ ...row, body, type, action_url: actionUrl } as NotificationRow);
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  function normalizeNotificationRows(rows: unknown): NotificationRow[] {
    return Array.isArray(rows) ? (rows as NotificationRow[]) : [];
  }

  const mergeNotification = useCallback((notification: Notification) => {
    setNotifications((prev) =>
      sortNotifications([
        notification,
        ...prev.filter((item) => item.id !== notification.id),
      ]).slice(0, 50)
    );
  }, []);

  const fetchNotifications = useCallback(async (uid: string) => {
    setError(null);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(
        normalizeNotificationRows(data).map((row) => parseNotificationRow(row as LocalNotificationRow))
      );
    } catch (err) {
      console.error("Notifications fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;

    const readAt = new Date().toISOString();
    setError(null);

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: readAt })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: readAt } : n
        )
      );
    } catch (err) {
      console.error("Mark read error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to mark the notification as read."
      );
      throw err;
    }
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;

    const readAt = new Date().toISOString();
    setError(null);

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: readAt })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.is_read ? n : { ...n, is_read: true, read_at: readAt }))
      );
    } catch (err) {
      console.error("Mark all read error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to mark notifications as read."
      );
      throw err;
    }
  }, [userId]);

  const unreadCount = getUnreadNotificationCount(notifications);

  // Get user and subscribe
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let isActive = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isActive) return;

      if (!user) {
        setUserId(null);
        setError(null);
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      await fetchNotifications(user.id);
      if (!isActive) return;

      channel = supabase
        .channel(`notifications-realtime-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            mergeNotification(parseNotificationRow(payload.new as LocalNotificationRow));
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            mergeNotification(parseNotificationRow(payload.new as LocalNotificationRow));
          }
        )
        .subscribe();
    };

    init();

    return () => {
      isActive = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchNotifications, mergeNotification]);

  return { notifications, isLoading, error, unreadCount, markAsRead, markAllRead };
}
