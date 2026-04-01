"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabaseClient";

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

function sortNotifications(items: Notification[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
      setNotifications(((data as unknown) as Notification[]) || []);
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
            mergeNotification((payload.new as unknown) as Notification);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            mergeNotification((payload.new as unknown) as Notification);
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
